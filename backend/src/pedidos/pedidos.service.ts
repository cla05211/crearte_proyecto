import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PedidoDTO } from './dto/pedido.dto';
import { BadRequestException } from '@nestjs/common';
import { PedidoDTOResponse } from './dto/pedidoResponse.dto';

@Injectable()
export class PedidosService 
{
    constructor(private sb: SupabaseService){}
    
    async crearPedido(dto: PedidoDTO)
    {
        const {data,error} = await this.sb.supabase
            .from('pedidos')
            .insert(dto)
            .select('id')
            .single();

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data.id;
    }

    async obtenerVendedora(idPedido:number)
    {
        const {data,error} = await this.sb.supabase
            .from('pedidos')
            .select('id_vendedora')
            .eq('id',idPedido)
            .single();

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data.id_vendedora;        
    }

    async obtenerPedidos(idGrupo:number): Promise<PedidoDTOResponse>
    {
        const {data,error} = await this.sb.supabase
            .from('pedidos')
            .select('*')
            .eq('id_grupo',idGrupo)
            .single();

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data as PedidoDTOResponse   
    }
}
