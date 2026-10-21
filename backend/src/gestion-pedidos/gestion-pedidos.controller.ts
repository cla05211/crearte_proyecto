import { BadRequestException, Controller, Post, UseGuards, Body, Get, Patch, Query, ParseIntPipe, Param, ParseBoolPipe } from '@nestjs/common';
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

    @Get ('presupuesto-clientes/:idGrupo')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_presupuesto')
    async obtenerPresupuestoPedidoClientesPage(@Param('idGrupo', ParseIntPipe) idGrupo:number)
    {
        return await this.gestionService.obtenerPresupuestoPedidosClientes(idGrupo);
    }
        
    @Get ('importe/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_administrativo')
    async obtenerImporteTotalPedido(@Param('id', ParseIntPipe)idPedido: number)
    {
        return await this.gestionService.obtenerImporteTotalPedido(idPedido);
    }
        
    @Get ('control-talles-disenio')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_talles_disenio')
    async obtenerDatosPedidosControlTallesDisenio(@Query('promo', ParseIntPipe) promo: number, @Query('mes', ParseIntPipe) mes: number, @Query('busqueda') busqueda?: string)
    {
        return await this.gestionService.obtenerDatosPedidosControlTallesDisenio(mes,promo,busqueda);
    }

    @Get ('control-produccion')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async obtenerDatosControlProduccion(@Query('mesEntrega', ParseIntPipe) mesEntrega: number, @Query('anioEntrega', ParseIntPipe) anioEntrega: number, @Query('enviadosFabrica', ParseBoolPipe) enviadosFabrica: boolean)
    {
        return await this.gestionService.obtenerDatosProduccion(mesEntrega,anioEntrega,enviadosFabrica);
    }
    

    // Botón "Enviar a fábrica" de control de fábrica
    @Post('enviar-fabrica/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async enviarPedidoFabrica(@Param('id', ParseIntPipe) idPedido: number, @Body() dto: { mesEntrega: number; anioEntrega: number })
    {
        const mes = Number(dto?.mesEntrega);
        const anio = Number(dto?.anioEntrega);

        if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio) || anio < 2000)
        {
            throw new BadRequestException('Mes o año de entrega inválido.');
        }

        return await this.gestionService.enviarPedidoFabrica(idPedido, mes, anio);
    }

    @Patch('modificar-pedidos')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async modificarPlanPedido(@Body() dto: ModificarPlanPedidoDTO)
    {
        return await this.gestionService.modificarPlanPedido(dto);
    }


}
