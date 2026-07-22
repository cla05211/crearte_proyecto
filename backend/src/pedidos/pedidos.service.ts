import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PedidoDTO } from './dto/pedido.dto';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class PedidosService 
{
    constructor(private sb: SupabaseService){}
    
    async crearPedido(dto: PedidoDTO)
    {
        console.log('DTO recibido:', dto);
        const {data,error} = await this.sb.supabase
            .from('pedidos')
            .insert(dto)
            .select('id')
            .single();

        console.log('Resultado Supabase:', data);
        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data.id;
    }
}
