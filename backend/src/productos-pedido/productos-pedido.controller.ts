import { Body, Post, Controller, Delete, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ProductosPedidoService } from './productos-pedido-service.service';
import { EliminarProductoPedidoDTO } from './dto/EliminarProductoPedido.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { ModificarDescripcionProductoPedido } from './dto/ModificarDescripcionProductoPedido';
import { ModificarCantidadProductoPedido } from './dto/ModificarCantidadProductoPedido';
import { ProductoPedidoDTO } from './dto/ProductoPedido.dto';

@Controller('productos-pedido')
export class ProductosPedidoController 
{
    constructor(private productosPedidosService: ProductosPedidoService){}

    @Post()
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('crear_pedido')
    async crearProductosPedido(@Body() dto: ProductoPedidoDTO[])
    {
        return await this.productosPedidosService.crearPedido(dto);
    }

    @Delete('/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async eliminarProductosPedido(@Param('id', ParseIntPipe)idPedido: number)
    {
        return await this.productosPedidosService.eliminarTodosProductosPedido(idPedido);
    }

    @Patch('descripcion')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async modificarDescripcionProductoPedido(@Body() dto: ModificarDescripcionProductoPedido)
    {
        return await this.productosPedidosService.modificarDescripcionProductoPedido(dto);
    }  

    @Patch('cantidad')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async modificarCantidadProductoPedido(@Body() dto: ModificarCantidadProductoPedido)
    {
        return await this.productosPedidosService.modificarCantidadProducto(dto);
    }  

}
