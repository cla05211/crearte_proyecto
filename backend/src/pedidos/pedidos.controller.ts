import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { PedidosService } from './pedidos.service';


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
}
