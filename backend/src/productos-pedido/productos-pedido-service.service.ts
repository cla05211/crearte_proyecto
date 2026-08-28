import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';
import { ProductoPedidoDTO } from './dto/ProductoPedido.dto';
import { EliminarProductoPedidoDTO } from './dto/EliminarProductoPedido.dto';
import { ModificarDescripcionProductoPedido } from './dto/ModificarDescripcionProductoPedido';
import { ModificarCantidadProductoPedido } from './dto/ModificarCantidadProductoPedido';
import { ProductoPedidoResponseDTO } from './dto/ProductoPedidoResponse.dto copy';
import { ProductoPedidoResponseConNombreOriginalDTO } from './dto/ProductoPedidoResponseConNombreOriginal.dto';

@Injectable()
export class ProductosPedidoService 
{
    constructor(private sb: SupabaseService){}
    
    async crearPedido(pedidosDtos: ProductoPedidoDTO[])
    {
        var mensaje = "Exito";

        const { data, error } = await this.sb.supabase
        .from('productos_pedidos')
        .insert(pedidosDtos)
        .select();

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return mensaje;
    }

    async eliminarProductoPedido(dto: EliminarProductoPedidoDTO)
    {
        const { data, error } = await this.sb.supabase
            .from('productos_pedidos')
            .delete()
            .eq('id_pedido', dto.id_pedido)
            .eq('id_producto_original', dto.id_producto_original)
            .single()

        if (error) 
        {
            throw new InternalServerErrorException(`No se pudo eliminar el producto del pedido. ${error.message}`);
        }

        return data;       
    }

    async eliminarTodosProductosPedido(idPedido: number)
    {
        const { data, error } = await this.sb.supabase
        .from('productos_pedidos')
        .delete()
        .eq('id_pedido', idPedido)

        if (error) 
        {
            throw new InternalServerErrorException(`No se pudo eliminar el producto del pedido. ${error.message}`);
        }

        return data;      
    }

    async modificarDescripcionProductoPedido(dto: ModificarDescripcionProductoPedido)
    {
        const { data, error } = await this.sb.supabase
        .from("productos_pedidos")
        .update({ descripcion: dto.descripcion })
        .eq("id_pedido", dto.id_pedido)
        .eq("id_producto_original", dto.id_producto_original)
        .select()
        .single();

        if (error) 
        {
            throw new Error(error.message);
        }

        return data.descripcion;
    }

    async modificarCantidadProducto(dto: ModificarCantidadProductoPedido)
    {
        const { data, error } = await this.sb.supabase
        .from("productos_pedidos")
        .update({ cantidad: dto.cantidad})
        .eq("id_pedido", dto.id_pedido)
        .eq("id_producto_original", dto.id_producto_original)
        .select()
        .single();

        if (error) 
        {
            throw new Error(error.message);
        }

        return data.cantidad;
    }

    async traerProductosPedidoConNombreProducto(idPedido: number):Promise<ProductoPedidoResponseConNombreOriginalDTO[]>
    {
        const {data,error} = await this.sb.supabase
            .from('productos_pedidos')
            .select('*, productos(nombre)')
            .eq('id_pedido',idPedido);

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        const productos: ProductoPedidoResponseConNombreOriginalDTO[] = data.map(p => ({
            id: p.id,
            id_pedido: p.id_pedido,
            id_producto_original: p.id_producto_original,
            descripcion: p.descripcion,
            beneficio: p.beneficio,
            valor_senia: p.valor_senia,
            valor_cuota: p.valor_cuota,
            cantidad: p.cantidad,
            nombreProductoOriginal: p.productos.nombre,
        }));

        return productos;  
    }
}
