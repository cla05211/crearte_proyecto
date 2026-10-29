import { ConflictException, Injectable } from '@nestjs/common';
import { GruposService } from 'src/grupos/grupos.service';
import { GestionPedidosService } from 'src/gestion-pedidos/gestion-pedidos.service';
import { CuotasService } from 'src/cuotas/cuotas.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { StorageService } from 'src/storage/storage.service';
import { PdfService } from 'src/reportes/pdf/pdf.service';
import { GenerarContratoDTO } from 'src/reportes/pdf/dto/generarContrato.dto';

// En el contrato firman como máximo los 3 primeros padres responsables (ordenados por id)
const CANTIDAD_MAXIMA_FIRMANTES = 3;

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// 'YYYY-MM-DD' -> partes numéricas, sin pasar por new Date() (evita el corrimiento de zona horaria)
const partesFecha = (fecha: string) =>
{
    const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
    return { anio, mes, dia };
};

// Contrato de venta: lo usan el admin (pagos/contrato) y el portal de clientes, así los dos ven el mismo PDF.
import { calcularSeniaTotal } from 'src/pagos/estadoSeña.util';

@Injectable()
export class ContratosService
{
    constructor(
        private gruposService: GruposService,
        private gestionPedidosService: GestionPedidosService,
        private cuotasService: CuotasService,
        private documentosService: DocumentosService,
        private storageService: StorageService,
        private pdfService: PdfService,
    ) {}

    async generarPdfContrato(idGrupo: number): Promise<Buffer>
    {
        const dto = await this.armarDatosContrato(idGrupo);
        return await this.pdfService.generarContratoVenta(dto);
    }

    // Arma los datos del contrato desde la base, con las firmas de los padres que ya firmaron.
    async armarDatosContrato(idGrupo: number): Promise<GenerarContratoDTO>
    {
        const [datosGrupo, presupuesto] = await Promise.all([
            this.gruposService.traerDatosGrupoClientePage(idGrupo),
            this.gestionPedidosService.obtenerPresupuestoPedidosClientes(idGrupo),
        ]);
        const pedido = presupuesto.pedido;

        if (!pedido.fecha_entrega_aproximada)
        {
            throw new ConflictException('El contrato todavía no está disponible.');
        }

        const cuotas = (await this.cuotasService.traerCuotasPorIdPedido(pedido.id))
            .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));

        // Fecha del acuerdo: la aprobación más reciente entre boceto y talles
        const fechaAcuerdo = [pedido.fecha_aprobacion_boceto, pedido.fecha_aprobacion_talles]
            .filter((fecha): fecha is string => !!fecha)
            .map(fecha => fecha.slice(0, 10))
            .sort()
            .at(-1) ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
        const acuerdo = partesFecha(fechaAcuerdo);
        const entrega = partesFecha(pedido.fecha_entrega_aproximada);

        const firmantes = (datosGrupo.padresResponsables ?? []).slice(0, CANTIDAD_MAXIMA_FIRMANTES);
        const compradores = await Promise.all(firmantes.map(async padre => ({
            nombre: `${padre.nombre ?? ''} ${padre.apellido ?? ''}`.trim(),
            dni: padre.dni ?? '',
            firma: padre.firma ? await this.descargarFirmaBase64(padre.firma) : null,
        })));

        const montoSenia = calcularSeniaTotal(presupuesto.pedido.senia_total, presupuesto.productosPedido);
        const montoCuotas = cuotas.reduce((total, cuota) => total + (cuota.importe ?? 0), 0);

        return {
            diaFecha: String(acuerdo.dia),
            mesFecha: MESES[acuerdo.mes - 1],
            anioFecha: String(acuerdo.anio),
            compradores,
            colegioNombre: datosGrupo.grupo.colegio?.nombre ?? '',
            turno: datosGrupo.grupo.turno ?? '',
            orientacion: datosGrupo.grupo.orientacion ?? undefined,
            localidad: datosGrupo.grupo.colegio?.localidad ?? '',
            provincia: datosGrupo.grupo.colegio?.provincia ?? '',
            productos: presupuesto.productosPedido.map(producto => ({
                cantidad: producto.cantidad,
                producto: producto.nombreProductoOriginal,
            })),
            beneficios: (presupuesto.beneficios ?? []).map(b => `${b.cantidad} ${b.beneficio}`),
            tieneSenia: montoSenia > 0,
            montoSenia: montoSenia > 0 ? montoSenia : undefined,
            montoTotal: montoSenia + montoCuotas,
            cuotas: cuotas.map(cuota =>
            {
                if (!cuota.fecha_vencimiento) return { monto: cuota.importe ?? 0 };
                const { anio, mes, dia } = partesFecha(cuota.fecha_vencimiento);
                return { monto: cuota.importe ?? 0, vencimiento: `${dia}/${mes}/${anio}` };
            }),
            mesEntrega: MESES[entrega.mes - 1],
            anioEntrega: String(entrega.anio),
        };
    }

    private async descargarFirmaBase64(idDocumento: number): Promise<string | null>
    {
        try
        {
            const ruta = await this.documentosService.obtenerArchivoUrl(idDocumento);
            return ruta ? (await this.storageService.descargarArchivo(ruta)).toString('base64') : null;
        }
        catch
        {
            // Si no se puede bajar una firma, el contrato sale igual con ese bloque en blanco
            return null;
        }
    }
}
