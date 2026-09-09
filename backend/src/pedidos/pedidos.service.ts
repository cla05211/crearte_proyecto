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

    async obtenerPedidoGrupo(idGrupo:number): Promise<PedidoDTOResponse>
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

    async obtenerIdPedidoGrupo(idGrupo:number):Promise<number>
    {
        const {data,error} = await this.sb.supabase
        .from('pedidos')
        .select('id')
        .eq('id_grupo',idGrupo)
        .single();

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data.id;
    }

    async modificarDiseniadora(idDiseniadora:number, idPedido: number)
    {
        const { data, error } = await this.sb.supabase
        .from("pedidos")
        .update({ id_disenadora: idDiseniadora })
        .eq("id", idPedido);

        if (error)
        {
            throw new Error(error.message);
        }
    }

    async modificarEstadoTalles(nuevoEstado:string, idPedido: number, fechaConfirmacion?:string)
    {
        const { data, error } = await this.sb.supabase
        .from("pedidos")
        .update({ estado_talles: nuevoEstado})
        .eq("id", idPedido);

        if(fechaConfirmacion)
        {
            await this.modificarFechaConfirmacionTalles(fechaConfirmacion,idPedido)
        }

        if (error)
        {
            throw new Error(error.message);
        }
    }

    async modificarEstadoDisenio(nuevoEstado:string, idPedido: number)
    {
        const { data, error } = await this.sb.supabase
        .from("pedidos")
        .update({ estado_boceto: nuevoEstado})
        .eq("id", idPedido);

        if (error)
        {
            throw new Error(error.message);
        }
    }

    async modificarFechaAprobacionDisenio(fecha:string, idPedido: number)
    {
        const { data, error } = await this.sb.supabase
        .from("pedidos")
        .update({ fecha_aprobacion_boceto: fecha})
        .eq("id", idPedido);

        if (error)
        {
            throw new Error(error.message);
        }
    }

    private async modificarFechaConfirmacionTalles(fecha:string, idPedido: number)
    {
        const { data, error } = await this.sb.supabase
        .from("pedidos")
        .update({ fecha_aprobacion_talles: fecha})
        .eq("id", idPedido);

        if (error)
        {
            throw new Error(error.message);
        }
    }

    async modificarTelefonoPrincipal(nuevoNro: string,idPedido:number)
    {
        const { data, error } = await this.sb.supabase
        .from("pedidos")
        .update({ telefono_principal: nuevoNro})
        .eq("id", idPedido);

        if (error)
        {
            throw new Error(error.message);
        }
    }

    async enviarPedidoFabrica(idPedido: number)
    {
        const { data, error } = await this.sb.supabase.rpc(
        'enviar_pedido_a_fabrica',
        {
            p_id_pedido: idPedido,
        }
        );

        if (error)
        {
            throw new BadRequestException(error.message);
        }
        return data;
    }
}
