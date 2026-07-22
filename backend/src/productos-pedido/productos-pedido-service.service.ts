import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';
import { ProductoPedidoDTO } from './dto/ProductoPedido.dto';

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
}
