import { Injectable } from '@nestjs/common';
import { GruposService } from 'src/grupos/grupos.service';
import { GestionPedidosService } from 'src/gestion-pedidos/gestion-pedidos.service';
import { PrendasPedidoTallesService } from 'src/prendas-pedido-talles/prendas-pedido-talles.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { StorageService } from 'src/storage/storage.service';
import { PdfService } from 'src/reportes/pdf/pdf.service';
import { PedidosService } from 'src/pedidos/pedidos.service';
import { GenerarResumenTallesDTO } from 'src/reportes/pdf/dto/generarResumenTalles.dto';
import { ProductoPrendasResumenDTO } from 'src/prendas-pedido-talles/dto/ResumenPrendasPedido.dto';
import { IDS_BUZO, IDS_CAMPERA, IDS_CHOMBA, IDS_REMERA } from 'src/productos/ids-prendas';


export const TIPO_DOCUMENTO_FIRMA_TALLES = 'Firma Talles';

// PDF de resumen de talles: lo usan el portal de clientes y la pestaña "Talles y diseño"
// del admin, así los dos ven exactamente el mismo archivo.
@Injectable()
export class ResumenTallesService
{
    constructor(
        private gruposService: GruposService,
        private gestionPedidosService: GestionPedidosService,
        private prendasService: PrendasPedidoTallesService,
        private documentosService: DocumentosService,
        private storageService: StorageService,
        private pdfService: PdfService,
        private pedidosService: PedidosService,
    ) {}

    async generarPdf(idGrupo: number): Promise<{ buffer: Buffer; idPedido: number; colegioNombre: string }>
    {
        const idPedido = await this.pedidosService.obtenerIdPedidoGrupo(idGrupo);

        const [datosGrupo, presupuesto, prendas] = await Promise.all([
            this.gruposService.traerDatosGrupoClientePage(idGrupo),
            this.gestionPedidosService.obtenerPresupuestoPedidosClientes(idGrupo),
            this.prendasService.traerResumenPrendasPedido(idPedido),
        ]);

        const padreResponsable = datosGrupo.padresResponsables?.find(p => p.principal);
        const nombreCompletoPadre = padreResponsable
            ? `${padreResponsable.nombre ?? ''} ${padreResponsable.apellido ?? ''}`.trim() || null
            : null;

        const beneficios = [
            ...presupuesto.beneficios.map(b => `${b.cantidad} ${b.beneficio}`),
            ...presupuesto.agregadosGlobales.map(a => a.agregado).filter((a): a is string => !!a),
        ];

        // Resumen previo: el cliente puede estar todavía cargando talles, así que no se corta el PDF.
        const prendasCobrables = this.prendasService.restarLiberadas(prendas, presupuesto.beneficios, false);
        const { combos, sueltas } = this.construirCombosYSueltas(prendasCobrables);

        // Si los talles ya se confirmaron, el PDF sale con la firma del cliente al final
        const documentoFirma = await this.documentosService.obtenerDocumentoPorTipo(idGrupo, TIPO_DOCUMENTO_FIRMA_TALLES);
        const firmaBase64 = documentoFirma?.archivo_url
            ? (await this.storageService.descargarArchivo(documentoFirma.archivo_url)).toString('base64')
            : null;

        const colegioNombre = datosGrupo.grupo.colegio?.nombre ?? '';

        const dto: GenerarResumenTallesDTO = {
            colegioNombre,
            localidad: datosGrupo.grupo.colegio?.localidad ?? null,
            provincia: datosGrupo.grupo.colegio?.provincia ?? null,
            turno: datosGrupo.grupo.turno,
            nivel: datosGrupo.grupo.nivel,
            orientacion: datosGrupo.grupo.orientacion,
            padreResponsable: nombreCompletoPadre,
            combos,
            sueltas,
            prendas: prendas.map(p => ({ nombreProducto: p.nombreProducto, talles: p.talles, total: p.total })),
            beneficios,
            firmaBase64,
            fechaFirma: documentoFirma?.created_at ?? null,
        };

        const buffer = await this.pdfService.generarResumenTalles(dto);

        return { buffer, idPedido, colegioNombre };
    }

    private construirCombosYSueltas(prendas: ProductoPrendasResumenDTO[])
    {
        const productoCampera = prendas.find(p => IDS_CAMPERA.includes(p.idProducto));
        const productoBuzo = prendas.find(p => IDS_BUZO.includes(p.idProducto));
        const productoRemera = prendas.find(p => IDS_REMERA.includes(p.idProducto));
        const productoChomba = prendas.find(p => IDS_CHOMBA.includes(p.idProducto));

        // Combo = prenda de arriba (campera o buzo) + prenda de abajo (remera o chomba)
        const productoCamperaBuzo = productoCampera ?? productoBuzo;
        const productoRemeraChomba = productoRemera ?? productoChomba;
        // Solo se sacan las dos que arman el combo: si hay otra (ej. campera y buzo), va como suelta
        const otros = prendas.filter(p => p !== productoCamperaBuzo && p !== productoRemeraChomba);

        const combos: { nombreCombo: string; cantidad: number; componentes: { nombre: string; cantidad: number }[] }[] = [];
        const sueltas: { nombre: string; cantidad: number }[] = [];

        if (productoCamperaBuzo && productoRemeraChomba)
        {
            const cantidadCombos = Math.min(productoCamperaBuzo.total, productoRemeraChomba.total);

            if (cantidadCombos > 0)
            {
                combos.push({
                    nombreCombo: `${productoCamperaBuzo.nombreProducto} + ${productoRemeraChomba.nombreProducto}`,
                    cantidad: cantidadCombos,
                    componentes: [
                        { nombre: productoCamperaBuzo.nombreProducto, cantidad: 1 },
                        { nombre: productoRemeraChomba.nombreProducto, cantidad: 1 },
                    ],
                });
            }

            const sobranteCamperaBuzo = productoCamperaBuzo.total - cantidadCombos;
            const sobranteRemeraChomba = productoRemeraChomba.total - cantidadCombos;

            if (sobranteCamperaBuzo > 0) { sueltas.push({ nombre: productoCamperaBuzo.nombreProducto, cantidad: sobranteCamperaBuzo }); }
            if (sobranteRemeraChomba > 0) { sueltas.push({ nombre: productoRemeraChomba.nombreProducto, cantidad: sobranteRemeraChomba }); }
        }
        else
        {
            if (productoCamperaBuzo) { sueltas.push({ nombre: productoCamperaBuzo.nombreProducto, cantidad: productoCamperaBuzo.total }); }
            if (productoRemeraChomba) { sueltas.push({ nombre: productoRemeraChomba.nombreProducto, cantidad: productoRemeraChomba.total }); }
        }

        for (const producto of otros)
        {
            sueltas.push({ nombre: producto.nombreProducto, cantidad: producto.total });
        }

        return { combos, sueltas };
    }
}
