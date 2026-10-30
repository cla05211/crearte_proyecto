import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PedidoDTO } from './dto/pedido.dto';
import { BadRequestException } from '@nestjs/common';
import { PedidoDTOResponse } from './dto/pedidoResponse.dto';

export const ESTADO_PEDIDO_CANCELADO = 'Cancelado';

export type CategoriaPrenda = 'camperas' | 'buzos' | 'chombas' | 'remeras' | 'pantalon' | 'bandera';
export type EstadoPrendaGuardado = 'Pendiente' | 'Ok';

export const CATEGORIAS_PRENDA: CategoriaPrenda[] = ['camperas', 'buzos', 'chombas', 'remeras', 'pantalon', 'bandera'];
export const ESTADOS_PRENDA: EstadoPrendaGuardado[] = ['Pendiente', 'Ok'];

const COLUMNA_ESTADO_PRENDA = {
    camperas: 'estado_camperas',
    buzos: 'estado_buzos',
    chombas: 'estado_chombas',
    remeras: 'estado_remeras',
    pantalon: 'estado_pantalon',
    bandera: 'estado_bandera',
} as const;

type ColumnaEstadoPrenda = (typeof COLUMNA_ESTADO_PRENDA)[CategoriaPrenda];

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

    async obtenerEstadoTalles(idPedido:number):Promise<string | null>
    {
        const {data,error} = await this.sb.supabase
        .from('pedidos')
        .select('estado_talles')
        .eq('id',idPedido)
        .single();

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data.estado_talles;
    }

    async definirFechaEntrega(idPedido: number, fecha:string)
    {
        const { data, error } = await this.sb.supabase
        .from("pedidos")
        .update({ fecha_entrega_aproximada: fecha})
        .eq("id", idPedido);

        if (error)
        {
            throw new Error(error.message);
        }
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

    async modificarEstadoGeneralPedido(idPedido:number, nuevoEstado:string)
    {
        const { data, error } = await this.sb.supabase
        .from("pedidos")
        .update({ estado_general: nuevoEstado})
        .eq("id", idPedido);

        if (error)
        {
            throw new Error(error.message);
        }
    }

    // Edición excepcional de talles ya confirmados (la habilita administración)
    async obtenerEdicionTallesHabilitada(idPedido: number): Promise<boolean>
    {
        const { data, error } = await this.sb.supabase
        .from("pedidos")
        .select("talles_edicion_habilitada")
        .eq("id", idPedido)
        .single();

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        return data.talles_edicion_habilitada;
    }

    async modificarEdicionTallesHabilitada(idPedido: number, habilitada: boolean)
    {
        const { error } = await this.sb.supabase
        .from("pedidos")
        .update({ talles_edicion_habilitada: habilitada })
        .eq("id", idPedido);

        if (error)
        {
            throw new BadRequestException(error.message);
        }
    }

    // Estado de producción de una categoría de prendas del pedido (control de fábrica)
    async modificarEstadoPrenda(idPedido: number, prenda: CategoriaPrenda, nuevoEstado: EstadoPrendaGuardado)
    {
        const { error } = await this.sb.supabase
        .from("pedidos")
        // La clave calculada se tipa como string; el cast la acota a las columnas de estado
        .update({ [COLUMNA_ESTADO_PRENDA[prenda]]: nuevoEstado } as Partial<Record<ColumnaEstadoPrenda, EstadoPrendaGuardado>>)
        .eq("id", idPedido);

        if (error)
        {
            throw new BadRequestException(error.message);
        }
    }

    async determinartipoTalles(idPedido: number): Promise<string>
    {
        const { data, error } = await this.sb.supabase
        .from("pedidos")
        .select('talles')
        .eq("id", idPedido)
        .single();

        if (error)
        {
            throw new Error(error.message);
        }

        return data.talles!;
    }

    async determinarBandera(idPedido:number):Promise<boolean>
    {
        const ID_BENEFICIO_BANDERA = 1;
        const ID_AGREGADO_BANDERA = 53; 

        const { data, error } = await this.sb.supabase
            .from('pedidos')
            .select(`beneficios_pedido(id_beneficio),agregados_globales_pedido(id_agregado)`)
            .eq('id', idPedido)
            .single();
        
        if (error) throw new Error(error.message);
    
        const bandera = data.beneficios_pedido.some(b => b.id_beneficio == ID_BENEFICIO_BANDERA) ||
        data.agregados_globales_pedido.some(a => a.id_agregado == ID_AGREGADO_BANDERA);
        
        return bandera;
    }

    //La diferencia de esta con determinar es que determinas le mandas el pedido y consulta database. Esta le mandas ya con los datos
    tieneBandera(beneficios: { id_beneficio: number }[], agregados: { id_agregado: number|null }[]): boolean
    {
        const ID_BENEFICIO_BANDERA = 1;
        const ID_AGREGADO_BANDERA = 53;

        return beneficios.some(b => b.id_beneficio == ID_BENEFICIO_BANDERA) || agregados.some(a => a.id_agregado == ID_AGREGADO_BANDERA);
    }
}
