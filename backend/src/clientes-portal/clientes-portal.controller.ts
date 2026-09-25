import { BadRequestException, Body, Controller, ConflictException, ForbiddenException, Get, Param, ParseIntPipe, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClienteAuthGuard } from 'src/clientes-auth/guards/clientesAuthGuard';
import { PedidosService } from 'src/pedidos/pedidos.service';
import { PagosService } from 'src/pagos/pagos.service';
import { GestionPedidosService } from 'src/gestion-pedidos/gestion-pedidos.service';
import { CuotasService } from 'src/cuotas/cuotas.service';
import { ProductosPedidoService } from 'src/productos-pedido/productos-pedido-service.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { StorageService } from 'src/storage/storage.service';
import { DocumentoDTO } from 'src/documentos/dto/documento.dto';
import { CrearPagoClienteDto } from './dto/crearPagoCliente.dto';
import { ArchivoSubidoDTO } from 'src/storage/dto/ArchivoSubidoDTO';
import { GruposService } from 'src/grupos/grupos.service';
import { PrendaPedidoDTO } from 'src/prendas-pedido-talles/dto/PrendasPedido.dto';
import { PrendasPedidoTallesService } from 'src/prendas-pedido-talles/prendas-pedido-talles.service';
import { PdfService } from 'src/reportes/pdf/pdf.service';
import { GenerarResumenTallesDTO } from 'src/reportes/pdf/dto/generarResumenTalles.dto';
import { ProductoPrendasResumenDTO } from 'src/prendas-pedido-talles/dto/ResumenPrendasPedido.dto';
import { ProductosService } from 'src/productos/productos.service';
import { BeneficiosPedidoService } from 'src/beneficios-pedido/beneficios-pedido.service';
import { BeneficioPedidoDTO } from 'src/beneficios-pedido/dto/beneficioPedidoDTO';


const IDS_CAMPERA_BUZO = [63, 64, 71];
const IDS_REMERA_CHOMBA = [65, 66];

const TIPO_DOCUMENTO_FIRMA_TALLES = 'Firma Talles';

@Controller('clientes-portal')
@UseGuards(ClienteAuthGuard)
export class ClientesPortalController
{
    constructor(
        private pedidosService: PedidosService,
        private pagosService: PagosService,
        private gruposService: GruposService,
        private gestionPedidosService: GestionPedidosService,
        private cuotasService: CuotasService,
        private productosPedidoService: ProductosPedidoService,
        private documentosService: DocumentosService,
        private sb: SupabaseService,
        private storageService: StorageService,
        private prendasService: PrendasPedidoTallesService,
        private pdfService: PdfService,
        private productosService: ProductosService,
        private beneficiosPedidoService: BeneficiosPedidoService
    ) {}

    private async obtenerIdPedidoCliente(req: any): Promise<number>
    {
        return await this.pedidosService.obtenerIdPedidoGrupo(req.cliente.id_grupo);
    }

    @Get('pedido')
    async obtenerIdPedido(@Req() req)
    {
        return await this.obtenerIdPedidoCliente(req);
    }

    @Get('productos-componentes')
    async obtenerProductosPedidosComponentes(@Req() req)
    {
        const idPedido = await this.obtenerIdPedidoCliente(req);
        return await this.productosPedidoService.traerProductosPedidosComponentes(idPedido);
    }

    @Get('pagos')
    async obtenerPagos(@Req() req)
    {
        const idPedido = await this.obtenerIdPedidoCliente(req);
        return await this.pagosService.traerPagosPedido(idPedido);
    }

    @Get('cuotas')
    async obtenerCuotas(@Req() req)
    {
        const idPedido = await this.obtenerIdPedidoCliente(req);
        return await this.cuotasService.traerCuotasPorIdPedido(idPedido);
    }

    @Get('importe-total')
    async obtenerImporteTotal(@Req() req)
    {
        const idPedido = await this.obtenerIdPedidoCliente(req);
        return await this.gestionPedidosService.obtenerImporteTotalPedido(idPedido);
    }

    @Get('senia-total')
    async obtenerSeniaTotal(@Req() req)
    {
        const idPedido = await this.obtenerIdPedidoCliente(req);
        return await this.productosPedidoService.traerSeniaTotal(idPedido);
    }

    @Get('presupuesto')
    async obtenerPresupuesto(@Req() req)
    {
        return await this.gestionPedidosService.obtenerPresupuestoPedidosClientes(req.cliente.id_grupo);
    }

    @Get('nivel')
    async determinarSecundaria(@Req() req): Promise<boolean>
    {
        return await this.gruposService.determinarSecundaria(req.cliente.id_grupo);
    }

    @Get('documento/:id')
    async obtenerUrlDocumento(@Req() req, @Param('id', ParseIntPipe) idDocumento: number)
    {
        const idPedido = await this.obtenerIdPedidoCliente(req);

        const { data, error } = await this.sb.supabase
            .from('pagos')
            .select('id')
            .eq('id_documento', idDocumento)
            .eq('id_pedido', idPedido)
            .maybeSingle();

        if (error || !data)
        {
            throw new ForbiddenException('No tenés acceso a este documento.');
        }

        const ruta = await this.documentosService.obtenerArchivoUrl(idDocumento);
        return { url: await this.storageService.obtenerUrlArchivo(ruta!) };
    }

    @Get('prendas')
    async traerPrendasPedido(@Req() req): Promise<PrendaPedidoDTO[]>
    {
        const idPedido = await this.obtenerIdPedidoCliente(req);
        return await this.prendasService.traerPrendasPedido(idPedido);
    }

    @Get('tipo-talles')
    async determinartipoTalles(@Req() req): Promise<string>
    {
        const idPedido = await this.obtenerIdPedidoCliente(req);
        return await this.pedidosService.determinartipoTalles(idPedido);
    }

    @Get('resumen-talles')
    async obtenerResumenTalles(@Req() req, @Res() res: Response)
    {
        const idGrupo = req.cliente.id_grupo;
        const idPedido = await this.obtenerIdPedidoCliente(req);

        const [datosGrupo, presupuesto, prendas] = await Promise.all([
            this.gruposService.traerDatosGrupoClientePage(idGrupo),
            this.gestionPedidosService.obtenerPresupuestoPedidosClientes(idGrupo),
            this.prendasService.traerResumenPrendasPedido(idPedido),
        ]);

        const padreResponsable = datosGrupo.padresResponsables?.find(p => p.mail);
        const nombreCompletoPadre = padreResponsable
            ? `${padreResponsable.nombre ?? ''} ${padreResponsable.apellido ?? ''}`.trim() || null
            : null;

        const beneficios = [
            ...presupuesto.beneficios.map(b => `${b.cantidad} ${b.beneficio}`),
            ...presupuesto.agregadosGlobales.map(a => a.agregado).filter((a): a is string => !!a),
        ];

        const prendasCobrables = this.prendasService.restarLiberadas(prendas, presupuesto.beneficios);
        const { combos, sueltas } = this.construirCombosYSueltas(prendasCobrables);

        // Si los talles ya se confirmaron, el PDF sale con la firma del cliente al final
        const documentoFirma = await this.documentosService.obtenerDocumentoPorTipo(idGrupo, TIPO_DOCUMENTO_FIRMA_TALLES);
        const firmaBase64 = documentoFirma?.archivo_url
            ? (await this.storageService.descargarArchivo(documentoFirma.archivo_url)).toString('base64')
            : null;

        const dto: GenerarResumenTallesDTO = {
            colegioNombre: datosGrupo.grupo.colegio?.nombre ?? '',
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

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="resumen-talles-${idPedido}.pdf"`,
        });
        res.send(buffer);
    }

    private construirCombosYSueltas(prendas: ProductoPrendasResumenDTO[])
    {
        const productoCamperaBuzo = prendas.find(p => IDS_CAMPERA_BUZO.includes(p.idProducto));
        const productoRemeraChomba = prendas.find(p => IDS_REMERA_CHOMBA.includes(p.idProducto));
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
    
    @Post('pagos')
    @UseInterceptors(FileInterceptor('comprobante'))
    async crearPago(@Req() req, @Body() dtoPago: CrearPagoClienteDto, @UploadedFile() archivo: ArchivoSubidoDTO)
    {
        const idPedido = await this.obtenerIdPedidoCliente(req);
        const idGrupo = req.cliente.id_grupo;

        const nombreArchivo = `comprobante-${idPedido}-${Date.now()}-${archivo.originalname}`
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '-');

        const rutaComprobante = await this.storageService.guardarImagen(
            { pedidoId: idPedido.toString(), nombreArchivo, carpetaGuardado: 'comprobantes-clientes' },
            archivo,
        );

        const documentoDTO: DocumentoDTO = { id_grupo: idGrupo, tipo: 'comprobante', archivo_url: rutaComprobante };

        return await this.pagosService.crearPago({
            id_pedido: idPedido,
            nro_transferencia: dtoPago.nroTransferencia,
            monto: Number(dtoPago.monto),
            motivo: dtoPago.motivo,
            fecha: dtoPago.fecha,
            aprobado: true,
            banco: dtoPago.banco,
            entidad_pago: dtoPago.entidad_pago,
            documentoDTO,
        });
    }

    @Post('prendas')
    async guardarPrendasPedido(@Req() req, @Body() prendas: PrendaPedidoDTO[])
    {
        const idPedido = await this.obtenerIdPedidoCliente(req);
        return await this.prendasService.guardarPrendasPedido(idPedido, prendas);
    }

    @Get('talles-confirmados')
    async obtenerTallesConfirmados(@Req() req): Promise<boolean>
    {
        const documentoFirma = await this.documentosService.obtenerDocumentoPorTipo(req.cliente.id_grupo, TIPO_DOCUMENTO_FIRMA_TALLES);
        return !!documentoFirma;
    }

    @Post('confirmar-talles')
    @UseInterceptors(FileInterceptor('firma'))
    async confirmarTalles(@Req() req, @UploadedFile() firma: ArchivoSubidoDTO)
    {
        const idGrupo = req.cliente.id_grupo;
        const idPedido = await this.obtenerIdPedidoCliente(req);
        const presupuesto = await this.gestionPedidosService.obtenerPresupuestoPedidosClientes(idGrupo);

        if (!firma || firma.mimetype !== 'image/png')
        {
            throw new BadRequestException('Falta la firma o no es una imagen PNG.');
        }

        if (await this.documentosService.obtenerDocumentoPorTipo(idGrupo, TIPO_DOCUMENTO_FIRMA_TALLES))
        {
            throw new ConflictException('Los talles de este pedido ya fueron confirmados.');
        }

        //Guardar firma en storage
        const rutaFirma = await this.storageService.guardarImagen(
            { pedidoId: idPedido.toString(), nombreArchivo: `firma-talles-${idPedido}-${Date.now()}.png`, carpetaGuardado: 'firmas-talles' },
            firma,
        );

        //Obtener cantidad prendas
        const prendas = await this.prendasService.traerResumenPrendasPedido(idPedido);
        const prendasCobrables = this.prendasService.restarLiberadas(prendas, presupuesto.beneficios);
        const productosFinales = await this.prendasService.traerProductosFinalesPedido(prendasCobrables);

        //Modificar cantidad
        const nroCuotas = presupuesto.nroCuotas;
        const beneficios = presupuesto.beneficios ?? 'Sin Beneficio';

        const productos = await Promise.all(productosFinales.map(async producto =>
        {
            const precios = await this.productosService.obtenerPreciosId(producto.idProducto, nroCuotas, producto.cantidadPedida);
            const anterior = presupuesto.productosPedido.find(p => p.id_producto_original === producto.idProducto);

            return {
                id_pedido: idPedido,
                id_producto_original: producto.idProducto,
                descripcion: anterior?.descripcion ?? producto.nombreProducto,
                valor_senia: precios!.valor_senia,
                valor_cuota: precios!.valor_cuota,
                cantidad: producto.cantidadPedida,
            };
        }));

        const totalSenia = productos.reduce((total, p) => total + p.valor_senia * p.cantidad, 0);
        const totalCuotaSinDescuento = productos.reduce((total, p) => total + p.valor_cuota * p.cantidad, 0)
        const porcentaje = Number(presupuesto.pedido.porcentaje_descuento_hermanos) || 0;
        const hermanos = Number(presupuesto.pedido.cantidad_hermanos) || 0;
        const totalCuota = totalCuotaSinDescuento - totalCuotaSinDescuento * (porcentaje / 100) * hermanos;

        const resultado = await this.gestionPedidosService.modificarPlanPedido({
            id_pedido: idPedido,
            productos,
            agregadosGlobales: presupuesto.agregadosGlobales.map(a => ({ id_agregado: a.id_agregado })),
            nueva_cantidad_cuotas: nroCuotas,
            valor_cuota_nuevo: totalCuota,
            valor_senia_nuevo: totalSenia,
        });

        const fechaFirma = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
        await this.pedidosService.modificarEstadoTalles('Confirmado', idPedido, fechaFirma);

        await this.documentosService.subirDocumento({ id_grupo: idGrupo, tipo: TIPO_DOCUMENTO_FIRMA_TALLES, archivo_url: rutaFirma });

        return resultado;
    }
}
