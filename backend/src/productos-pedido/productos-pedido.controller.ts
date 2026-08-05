import { Body, Controller, Delete, Patch, UseGuards } from '@nestjs/common';
import { ProductosPedidoService } from './productos-pedido-service.service';
import { EliminarProductoPedidoDTO } from './dto/EliminarProductoPedido.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { ModificarDescripcionProductoPedido } from './dto/ModificarDescripcionProductoPedido';
import { ModificarCantidadProductoPedido } from './dto/ModificarCantidadProductoPedido';

@Controller('productos-pedido')
export class ProductosPedidoController 
{
    constructor(private productosPedidosService: ProductosPedidoService){}

    @Delete()
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async crearPedido(@Body() dto: EliminarProductoPedidoDTO)
    {
        return await this.productosPedidosService.eliminarProductoPedido(dto);
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
