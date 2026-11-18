import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GestionEnviosPedidosService } from './gestion-envios-pedidos.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { OPCIONES_COMPROBANTE } from 'src/common/limites-archivos';
import { ArchivoSubidoDTO } from 'src/storage/dto/ArchivoSubidoDTO';
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
        @Req() req,
    ): Promise<void>
    {
        await this.gestionEnviosPedidosService.modificarCotizacion(idPedido, cotizacion ?? null, req.usuario.id);
    }

    @Patch(':idPedido/entrega')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async confirmarEntrega(@Param('idPedido', ParseIntPipe) idPedido: number, @Body() dto: confirmarEntregaDto): Promise<void>
    {
        await this.gestionEnviosPedidosService.confirmarEntrega(idPedido, dto);
    }

    @Post(':idPedido/comprobante')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    @UseInterceptors(FileInterceptor('comprobante', OPCIONES_COMPROBANTE))
    async subirComprobante(
        @Param('idPedido', ParseIntPipe) idPedido: number,
        @UploadedFile() archivo: ArchivoSubidoDTO,
    ): Promise<{ idDocumento: number }>
    {
        return { idDocumento: await this.gestionEnviosPedidosService.subirComprobante(idPedido, archivo) };
    }
}
