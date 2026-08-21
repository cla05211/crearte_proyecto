import { Controller, Post, UseGuards, Body, Get, Patch, Query, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { GestionPedidosService } from './gestion-pedidos.service';
import { CrearPedidoDTO } from './dto/crearPedido.dto';
import { ModificarPlanPedidoDTO } from './dto/ModificarPlanPedido';

@Controller('gestion-pedidos')
export class GestionPedidosController 
{
    constructor(private gestionService: GestionPedidosService){}

    @Post ('crear-pedido')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('crear_pedido')
    async crearPedido(@Body() dto: CrearPedidoDTO)
    {
        return await this.gestionService.crearPedido(dto);
    }

    @Get ('')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('crear_pedido')
    async obtenerPedidosVentas( @Query('rangoDesde', ParseIntPipe) rangoDesde: number, @Query('rangoHasta', ParseIntPipe) rangoHasta: number,   @Query('busqueda') busqueda?: string, @Query('promo', ParseIntPipe) promo?: number,)
    {
        return await this.gestionService.obtenerPedidosVentas(rangoDesde, rangoHasta, busqueda, promo);
    }

    @Patch('modificar-pedidos')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async modificarPlanPedido(@Body() dto: ModificarPlanPedidoDTO)
    {
        return await this.gestionService.modificarPlanPedido(dto);
    }
}
