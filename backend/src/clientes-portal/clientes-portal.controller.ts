import { BadRequestException, Body, Controller, ConflictException, ForbiddenException, Get, Param, ParseIntPipe, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors, Query } from '@nestjs/common';
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
import { BeneficiosPedidoService } from 'src/beneficios-pedido/beneficios-pedido.service';
import { BeneficioPedidoDTO } from 'src/beneficios-pedido/dto/beneficioPedidoDTO';
import { PadreResponsableService } from 'src/padre-responsable/padre-responsable-service.service';
import { PadreResponsableResponseDTO } from 'src/padre-responsable/dto/padreResponsableResponse.dto';
import { ContratosService } from 'src/contratos/contratos.service';
import { ResumenTallesService } from 'src/resumen-talles/resumen-talles.service';
import { DiseniosService } from 'src/disenios/disenios.service';
import { DiseniosGrupoResponseDTO } from 'src/disenios/dto/DisenioResponseDTO';
import { RecalculoPlanTallesService } from 'src/prendas-pedido-talles/recalculo-plan-talles.service';


const TIPO_DOCUMENTO_FIRMA_TALLES = 'Firma Talles';
const TIPO_DOCUMENTO_FIRMA_CONTRATO = 'Firma Contrato';

// En el contrato firman como máximo los 3 primeros padres responsables (ordenados por id)
const CANTIDAD_MAXIMA_FIRMANTES = 3;

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
        private padresService: PadreResponsableService,
        private diseniosService: DiseniosService,
        private contratosService: ContratosService,
        private resumenTallesService: ResumenTallesService,
        private recalculoPlanTalles: RecalculoPlanTallesService,
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

    @Get('padres-responsables')
    async obtenerPadresResponsables(@Req() req): Promise<PadreResponsableResponseDTO[]>
    {
        return await this.padresService.traerPadresResponsables(req.cliente.id_grupo);
    }

    @Get('contrato-disponible')
    async obtenerContratoDisponible(@Req() req): Promise<boolean>
    {
        const pedido = await this.pedidosService.obtenerPedidoGrupo(req.cliente.id_grupo);
        return !!pedido.fecha_entrega_aproximada;
    }

    @Get('contrato')
    async obtenerContrato(@Req() req, @Res() res: Response)
    {
        const idGrupo = req.cliente.id_grupo;
        const buffer = await this.contratosService.generarPdfContrato(idGrupo);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="contrato-${idGrupo}.pdf"`,
        });
        res.send(buffer);
    }

    //Diseño
    
    @Get('disenios')
    async obtenerDisenios(@Req() req): Promise<DiseniosGrupoResponseDTO>
    {
        const idGrupo = req.cliente.id_grupo;

        return await this.diseniosService.listar(idGrupo);
    }

    @Get('url-descarga-disenios/:id')
    async obtenerUrlDescargaDisenio(@Req() req, @Param('id', ParseIntPipe) idDocumento: number, @Query('nombreArchivo') nombreArchivo: string): Promise<{ url: string }>
    {
        const idGrupo = req.cliente.id_grupo;

        return await this.diseniosService.crearUrlDescarga(idGrupo, idDocumento, nombreArchivo || 'disenio');
    }

    // Boceto firmado que subió el empleado (disponible una vez cargado)
    @Get('url-descarga-firmado/:id')
    async obtenerUrlDescargaFirmado(@Req() req, @Param('id', ParseIntPipe) idDocumento: number, @Query('nombreArchivo') nombreArchivo: string): Promise<{ url: string }>
    {
        const idGrupo = req.cliente.id_grupo;

        return await this.diseniosService.crearUrlDescargaFirmado(idGrupo, idDocumento, nombreArchivo || 'firmado');
    }


    //Talles

    @Get('resumen-talles')
    async obtenerResumenTalles(@Req() req, @Res() res: Response)
    {
        const { buffer, idPedido } = await this.resumenTallesService.generarPdf(req.cliente.id_grupo);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="resumen-talles-${idPedido}.pdf"`,
        });
        res.send(buffer);
    }

    @Get('talles-confirmados')
    async obtenerTallesConfirmados(@Req() req): Promise<boolean>
    {
        return await this.tallesConfirmados(req.cliente.id_grupo);
    }

    // true = administración reabrió la planilla de talles ya confirmados
    @Get('edicion-talles')
    async obtenerEdicionTallesHabilitada(@Req() req): Promise<boolean>
    {
        const idPedido = await this.obtenerIdPedidoCliente(req);
        return await this.pedidosService.obtenerEdicionTallesHabilitada(idPedido);
    }

    @Post('firmar-contrato')
    @UseInterceptors(FileInterceptor('firma'))
    async firmarContrato(@Req() req, @UploadedFile() firma: ArchivoSubidoDTO, @Body('idPadre', ParseIntPipe) idPadre: number)
    {
        const idGrupo = req.cliente.id_grupo;
        const pedido = await this.pedidosService.obtenerPedidoGrupo(idGrupo);

        if (!pedido.fecha_entrega_aproximada)
        {
            throw new ConflictException('El contrato todavía no está disponible para firmar.');
        }

        if (!firma || firma.mimetype !== 'image/png')
        {
            throw new BadRequestException('Falta la firma o no es una imagen PNG.');
        }

        // Solo pueden firmar los padres responsables de este grupo que figuran en el contrato
        const firmantes = (await this.padresService.traerPadresResponsables(idGrupo)).slice(0, CANTIDAD_MAXIMA_FIRMANTES);
        const padre = firmantes.find(p => p.id === idPadre);

        if (!padre)
        {
            throw new ForbiddenException('El padre responsable no pertenece a este contrato.');
        }

        if (padre.firma != null)
        {
            throw new ConflictException('Este padre responsable ya firmó el contrato.');
        }

        const rutaFirma = await this.storageService.guardarImagen(
            { pedidoId: pedido.id.toString(), nombreArchivo: `firma-contrato-${pedido.id}-${idPadre}-${Date.now()}.png`, carpetaGuardado: 'firmas-contrato' },
            firma,
        );

        const [idDocumento] = await this.documentosService.subirDocumento({ id_grupo: idGrupo, tipo: TIPO_DOCUMENTO_FIRMA_CONTRATO, archivo_url: rutaFirma });
        await this.padresService.subirFirmaPadreResponsable(idPadre, idDocumento);

        const todosFirmaron = firmantes.every(p => p.id === idPadre || p.firma != null);
        if (todosFirmaron)
        {
            const fechaFirma = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
            await this.gruposService.marcarContratoFirmado(idGrupo, fechaFirma);
        }

        return { todosFirmaron };
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

        // Con los talles confirmados solo se pueden modificar si administración habilitó la edición
        if (await this.tallesConfirmados(req.cliente.id_grupo) && !(await this.pedidosService.obtenerEdicionTallesHabilitada(idPedido)))
        {
            throw new ForbiddenException('Los talles ya fueron confirmados y no se pueden modificar.');
        }

        return await this.prendasService.guardarPrendasPedido(idPedido, prendas);
    }

    @Post('confirmar-talles')
    @UseInterceptors(FileInterceptor('firma'))
    async confirmarTalles(@Req() req, @UploadedFile() firma: ArchivoSubidoDTO)
    {
        const idGrupo = req.cliente.id_grupo;
        const idPedido = await this.obtenerIdPedidoCliente(req);

        if (!firma || firma.mimetype !== 'image/png')
        {
            throw new BadRequestException('Falta la firma o no es una imagen PNG.');
        }

        if (await this.tallesConfirmados(idGrupo))
        {
            throw new ConflictException('Los talles de este pedido ya fueron confirmados.');
        }

        // Se arma el plan antes de subir la firma: si faltan talles de prendas liberadas, corta acá
        const plan = await this.recalculoPlanTalles.prepararPlan(idGrupo, idPedido);

        //Guardar firma en storage
        const rutaFirma = await this.storageService.guardarImagen(
            { pedidoId: idPedido.toString(), nombreArchivo: `firma-talles-${idPedido}-${Date.now()}.png`, carpetaGuardado: 'firmas-talles' },
            firma,
        );

        const resultado = await this.recalculoPlanTalles.aplicarPlan(plan);

        const fechaFirma = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
        await this.pedidosService.modificarEstadoTalles('Confirmado', idPedido, fechaFirma);

        await this.documentosService.subirDocumento({ id_grupo: idGrupo, tipo: TIPO_DOCUMENTO_FIRMA_TALLES, archivo_url: rutaFirma });

        return resultado;
    }

    // Edición excepcional (habilitada por administración): se recalcula el plan con los talles nuevos
    // pero NO se pide firma ni se toca la confirmación original, el estado ni el nro de fábrica.
    @Post('guardar-talles-editados')
    async guardarTallesEditados(@Req() req)
    {
        const idGrupo = req.cliente.id_grupo;
        const idPedido = await this.obtenerIdPedidoCliente(req);

        if (!(await this.tallesConfirmados(idGrupo)) || !(await this.pedidosService.obtenerEdicionTallesHabilitada(idPedido)))
        {
            throw new ForbiddenException('La edición de talles no está habilitada.');
        }

        const resultado = await this.recalculoPlanTalles.recalcular(idGrupo, idPedido);
        await this.pedidosService.modificarEdicionTallesHabilitada(idPedido, false);

        return resultado;
    }

    private async tallesConfirmados(idGrupo: number): Promise<boolean>
    {
        return !!(await this.documentosService.obtenerDocumentoPorTipo(idGrupo, TIPO_DOCUMENTO_FIRMA_TALLES));
    }
}
