import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { GestionEnviosPedidosService, MedioPagoEnvio } from './gestion-envios-pedidos.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { modificarDatoSimpleDto } from './dto/modificarDatoSimpleDto';
import { confirmarEntregaDto } from './dto/confirmarEntregaDto';
import { pedidoListoParaEnviarDto } from './dto/traerPedidoEnvioDto';
import { pedidoEntregadoDto } from './dto/traerPedidoEntregadoDto';

@Controller('gestion-envios-pedidos')
export class GestionEnviosPedidosController 
{
    constructor(private readonly gestionEnviosPedidosService: GestionEnviosPedidosService) {}

    @Get('listos-enviar')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async traerPedidosListosParaEnviar(): Promise<pedidoListoParaEnviarDto[]>
    {
        return await this.gestionEnviosPedidosService.traerPedidosListosParaEnviar();
    }

    @Get('enviados')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async traerPedidosEnviados(@Query('mesEntrega', ParseIntPipe) mesEntrega: number, @Query('anioEntrega', ParseIntPipe) anioEntrega: number): Promise<pedidoEntregadoDto[]>
    {
        return await this.gestionEnviosPedidosService.traerPedidosEnviados(mesEntrega, anioEntrega);
    }

    // Desde Control de fábrica: pasa el pedido a "Listo para entregar" y crea su fila de envío
    @Post(':idPedido')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async marcarListoParaEntregar(@Param('idPedido', ParseIntPipe) idPedido: number): Promise<void>
    {
        await this.gestionEnviosPedidosService.marcarListoParaEntregar(idPedido);
    }

    @Patch(':idPedido/dato')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async modificarDatoSimple(@Param('idPedido', ParseIntPipe) idPedido: number, @Body() dto: modificarDatoSimpleDto): Promise<void>
    {
        await this.gestionEnviosPedidosService.modificarDatoSimple(idPedido, dto);
    }

    @Patch(':idPedido/cotizacion')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async modificarCotizacion(
        @Param('idPedido', ParseIntPipe) idPedido: number,
        @Body('cotizacion') cotizacion: number | null,
        @Body('medioPago') medioPago: MedioPagoEnvio | null,
        @Req() req,
    ): Promise<void>
    {
        await this.gestionEnviosPedidosService.modificarCotizacion(idPedido, cotizacion ?? null, medioPago ?? null, req.usuario.id);
    }

    @Patch(':idPedido/entrega')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async confirmarEntrega(@Param('idPedido', ParseIntPipe) idPedido: number, @Body() dto: confirmarEntregaDto): Promise<void>
    {
        await this.gestionEnviosPedidosService.confirmarEntrega(idPedido, dto);
    }

    // Paso 1: URL firmada para subir el comprobante de Via cargo directo a Supabase
    @Post(':idPedido/comprobante/url-subida')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async crearUrlSubidaComprobante(
        @Param('idPedido', ParseIntPipe) idPedido: number,
        @Body() dto: { nombreArchivo: string; mimetype: string },
    ): Promise<{ ruta: string; signedUrl: string }>
    {
        return await this.gestionEnviosPedidosService.crearUrlSubidaComprobante(idPedido, dto?.nombreArchivo, dto?.mimetype);
    }

    // Paso 2: el comprobante ya está subido; se valida y se asocia al envío
    @Post(':idPedido/comprobante')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async subirComprobante(
        @Param('idPedido', ParseIntPipe) idPedido: number,
        @Body('ruta') ruta: string,
    ): Promise<{ idDocumento: number }>
    {
        return { idDocumento: await this.gestionEnviosPedidosService.subirComprobante(idPedido, ruta) };
    }
}
