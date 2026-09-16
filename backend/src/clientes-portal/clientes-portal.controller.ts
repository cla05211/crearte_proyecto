import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
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

// Todos los endpoints de este controller son para el portal del cliente
// (padres/colegios), no para el staff. La autorización acá NO es por
// permiso/rol como en el resto del sistema: es por pertenencia. Nunca se
// recibe un id de pedido/grupo del frontend — siempre se deriva de
// req.cliente (que puso ClienteAuthGuard a partir del token validado
// contra sesiones_clientes), así un cliente no puede pedir ni tocar datos
// de otro colegio aunque manipule la request a mano.
@Controller('clientes-portal')
@UseGuards(ClienteAuthGuard)
export class ClientesPortalController
{
    constructor(
        private pedidosService: PedidosService,
        private pagosService: PagosService,
        private gestionPedidosService: GestionPedidosService,
        private cuotasService: CuotasService,
        private productosPedidoService: ProductosPedidoService,
        private documentosService: DocumentosService,
        private sb: SupabaseService,
        private storageService: StorageService,
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

    // A diferencia del resto de los endpoints de este controller, acá NO se
    // deriva primero un idPedido: obtenerPresupuestoPedidosClientes() espera
    // el id del GRUPO (así lo usa también la versión staff, en
    // GestionPedidosController), así que se le pasa req.cliente.id_grupo
    // directo. Pasarle un idPedido acá era un bug: buscaba el pedido
    // filtrando pedidos.id_grupo = idPedido, que solo "funcionaba" de
    // casualidad si el id del pedido coincidía con el id del grupo.
    @Get('presupuesto')
    async obtenerPresupuesto(@Req() req)
    {
        return await this.gestionPedidosService.obtenerPresupuestoPedidosClientes(req.cliente.id_grupo);
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
}
