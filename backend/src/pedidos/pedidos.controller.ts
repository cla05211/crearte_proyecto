import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { PedidosService } from './pedidos.service';
import { PedidoDTOResponse } from './dto/pedidoResponse.dto';


@Controller('pedidos')
export class PedidosController 
{
    constructor(private pedidosService: PedidosService){}

    @Post('nuevo-pedido')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('crear_pedido')
    async crearPedido()
    {
        return await this.crearPedido();
    }

    @Get(':id')
    @UseGuards(AuthGuard,PermisosGuard)
    async obtenerPedido(@Param('id')id: number) :Promise<PedidoDTOResponse>
    {
        return await this.pedidosService.obtenerPedidoGrupo(id);
    }

    @Get('vendedora/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    async obtenerVendedora(@Param('id')id: number) :Promise<number | null>
    {
        return await this.pedidosService.obtenerVendedora(id);
    }

    @Get('id/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    async obtenerPedidoGrupo(@Param('id')id: number) :Promise<number>
    {
        return await this.pedidosService.obtenerIdPedidoGrupo(id);
    }

    @Patch('diseniadora')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_talles_disenio')
    async modificarDiseniadora(@Query('idDiseniadora', ParseIntPipe) idDiseniadora: number, @Query('idPedido', ParseIntPipe) idPedido: number) 
    {
        await this.pedidosService.modificarDiseniadora(idDiseniadora, idPedido);
    }

    @Patch('estado-talles')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_talles_disenio')
    async modificarEstadoTalles(@Query('nuevoEstado') nuevoEstado: string, @Query('idPedido', ParseIntPipe) idPedido: number,  @Query('fechaConfirmacion') fechaConfirmacion?: string)
    {
        await this.pedidosService.modificarEstadoTalles(nuevoEstado,idPedido, fechaConfirmacion)
    }

    @Patch('estado-disenio')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_talles_disenio')
    async modificarEstadoDisenio(@Query('nuevoEstado') nuevoEstado: string, @Query('idPedido', ParseIntPipe) idPedido: number)
    {
        await this.pedidosService.modificarEstadoDisenio(nuevoEstado,idPedido)
    }

    @Patch('fecha-disenio')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_talles_disenio')
    async modificarFechaAprobacionDisenio(@Query('fecha') fecha: string, @Query('idPedido', ParseIntPipe) idPedido: number)
    {
        await this.pedidosService.modificarFechaAprobacionDisenio(fecha,idPedido)
    }

    @Patch('numero')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_talles_disenio')
    async modificarTelefonoPrincipal(@Query('nuevoNro') nuevoNro: string, @Query('idPedido', ParseIntPipe) idPedido: number)
    {
        await this.pedidosService.modificarTelefonoPrincipal(nuevoNro, idPedido)
    }

    @Patch('fabrica/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_talles_disenio')
    async enviarPedidoFabrica(@Param('idPedido', ParseIntPipe) idPedido: number)
    {
        return await this.pedidosService.enviarPedidoFabrica(idPedido);
    }

}
