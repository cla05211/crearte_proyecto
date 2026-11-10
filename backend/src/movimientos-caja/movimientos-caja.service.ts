import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { MovimientoCajaDTO } from './dto/movimientoCaja.dto';
import { limpiarBusqueda } from 'src/common/busqueda';
import { sumarEnBase } from 'src/common/sumar-en-base';
import { MovimientoCajaResponseDTO } from './dto/movimientoCajaResponse.dto';

@Injectable()
export class MovimientosCajaService 
{
    constructor(private sb: SupabaseService){}

    async crearMovimiento(dto: MovimientoCajaDTO):Promise<number>
    {
        const {data,error} = await this.sb.supabase
            .from('movimientos_caja')
            .insert(dto)
            .select('id')
            .single();

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data.id;
    }    

    async eliminarMovimiento(id: number):Promise<void>
    {
        const { error: errorDelete } = await this.sb.supabase
            .from('movimientos_caja')
            .delete()
            .eq('id', id);

        if (errorDelete) 
        {
            throw new InternalServerErrorException('No se pudo eliminar el movimiento');
        }
    }

    async modificarMovimiento(id: number, nuevoMovimiento: MovimientoCajaDTO)
    {
        const { error } = await this.sb.supabase
        .from('movimientos_caja')
        .update(nuevoMovimiento)
        .eq('id', id);

        if (error) 
        {
            throw new InternalServerErrorException('No se pudo eliminar el movimiento');
        }
    }

    async traerMovimientosBusqueda(rangoDesde: number, rangoHasta:number, busqueda?:string, tipo?:string, categoria?:string):Promise<MovimientoCajaResponseDTO[]>
    {
        let query = this.sb.supabase
        .from("vista_caja")
        .select(`*`)
        .order("fecha", {ascending: false,})
        .order("orden", {ascending: false,});

        if(busqueda)
        {
            query = query.or(`categoria.ilike.%${limpiarBusqueda(busqueda)}%,descripcion.ilike.%${limpiarBusqueda(busqueda)}%`);
        }

        if(tipo)
        {
            query = query.eq("tipo", tipo);
        }

        if(categoria)
        {
            query = query.eq("categoria", categoria);
        }

        const { data, error } = await query.range(rangoDesde, rangoHasta);

        if (error) 
        {
            throw new Error(error.message);
        }

        return data as MovimientoCajaResponseDTO[];
    }

    async obtenerTotalIngresos():Promise<number>
    {
        return await sumarEnBase(this.sb.supabase, 'sumar_movimientos_caja', { p_tipo: 'ingreso' });
    }

    async obtenerTotalEgresos():Promise<number>
    {
        return await sumarEnBase(this.sb.supabase, 'sumar_movimientos_caja', { p_tipo: 'egreso' });
    }
}
