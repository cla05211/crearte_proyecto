import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { CATEGORIAS_PRENDA, ESTADOS_PRENDA, PedidosService } from './pedidos.service';
import type { CategoriaPrenda, EstadoPrendaGuardado } from './pedidos.service';
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

    @Get('bandera/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    async determinarBandera(@Param('id')id: number) :Promise<boolean>
    {
        return await this.pedidosService.determinarBandera(id);
    }

    @Get('vendedora/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    async obtenerVendedora(@Param('id')id: number) :Promise<number | null>
    {
        return await this.pedidosService.obtenerVendedora(id);
    }

    @Get('talles/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    async obtenerEstadoTalles(@Param('id')id: number) :Promise<string | null>
    {
        return await this.pedidosService.obtenerEstadoTalles(id);
    }

    @Get('id/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    async obtenerPedidoGrupo(@Param('id')id: number) :Promise<number>
    {
        return await this.pedidosService.obtenerIdPedidoGrupo(id);
    }

    // Control de fábrica: marca una categoría de prendas (camperas, buzos, chombas, remeras, pantalon, bandera) como Ok o Pendiente
    @Patch('estado-prenda/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async modificarEstadoPrenda(@Param('id', ParseIntPipe) idPedido: number, @Query('prenda') prenda: CategoriaPrenda, @Query('nuevoEstado') nuevoEstado: EstadoPrendaGuardado)
    {
        if (!CATEGORIAS_PRENDA.includes(prenda) || !ESTADOS_PRENDA.includes(nuevoEstado))
        {
            throw new BadRequestException('Prenda o estado inválido.');
        }

        await this.pedidosService.modificarEstadoPrenda(idPedido, prenda, nuevoEstado);
    }

    @Patch('fecha-entrega/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_administrativo')
    async modificarFechaEntregaAproximada(@Query('fecha') fecha: string, @Param('id', ParseIntPipe) idPedido: number)
    {
        await this.pedidosService.definirFechaEntrega(idPedido,fecha)
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

    @Patch('estado-general')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async modificarEstadoGeneral(@Query('nuevoEstado') nuevoEstado: string, @Query('idPedido', ParseIntPipe) idPedido: number)
    {
        await this.pedidosService.modificarEstadoGeneralPedido(idPedido,nuevoEstado)
    }
    
    @Patch('estado-disenio')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_talles_disenio')
    async modificarEstadoDisenio(@Query('nuevoEstado') nuevoEstado: string, @Query('idPedido', ParseIntPipe) idPedido: number)
    {
        await this.pedidosService.modificarEstadoDisenio(nuevoEstado,idPedido)
    }
}
