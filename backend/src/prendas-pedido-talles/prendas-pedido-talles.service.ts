import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PrendaPedidoDTO } from './dto/PrendasPedido.dto';

@Injectable()
export class PrendasPedidoTallesService 
{
    constructor(private sb: SupabaseService){}
       
    async traerPrendasPedido(idPedido:number)
    {
        const { data, error } = await this.sb.supabase
        .from('prendas_pedido')
        .select('*')
        .eq('id_pedido', idPedido);

        if (error) 
        {
            throw new InternalServerErrorException(`No se pudieron traer las prendas. ${error.message}`);
        }

        const prendas: PrendaPedidoDTO[] = data.map(p => ({
            id_pedido: p.id_pedido,
            id_producto: p.id_producto!,
            talle: p.talle!,
            inscripcion: p.inscripcion
        }));

        return prendas;   
    }

    async guardarPrendasPedido(prendasPedido: PrendaPedidoDTO[])
    {
        await this.eliminarPrendasPedidoTalles(prendasPedido[0].id_pedido);

        const { data, error } = await this.sb.supabase
        .from('prendas_pedido')
        .insert(prendasPedido)

        if (error) 
        {
            throw new InternalServerErrorException(`No se pudieron agregar las prendas. ${error.message}`);
        }

        return data;      
    }

    async eliminarPrendasPedidoTalles(idPedido:number)
    {
        const { data, error } = await this.sb.supabase
        .from('prendas_pedido')
        .delete()
        .eq('id_pedido', idPedido)

        if (error) 
        {
            throw new InternalServerErrorException(`No se pudieron eliminar las prendas del pedido. ${error.message}`);
        }

        return data;      
    }
}
