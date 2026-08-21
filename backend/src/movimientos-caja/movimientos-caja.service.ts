import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { MovimientoCajaDTO } from './dto/movimientoCaja.dto copy';
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
            throw new InternalServerErrorException('No se pudo eliminar el usuario');
        }
    }

    async traerMovimientosBusqueda(rangoDesde: number, rangoHasta:number, busqueda?:string, tipo?:string, categoria?:string):Promise<MovimientoCajaResponseDTO[]>
    {
        let query = this.sb.supabase
        .from("vista_caja")
        .select(`*`)
        .order("fecha", {ascending: false,});

        if(busqueda)
        {
            query = query.or(`categoria.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`);
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
        let total = 0;

        const { data, error } = await this.sb.supabase
        .from('movimientos_caja')
        .select('monto')
        .eq('tipo', 'ingreso');

        if (error) 
        {
            throw new Error(error.message);
        }    

        if(data)
        {    
            total = data.reduce((total, pago) => total + pago.monto, 0);
        }
        
        return total;          
    }

    async obtenerTotalEgresos():Promise<number>
    {
        let total = 0;

        const { data, error } = await this.sb.supabase
        .from('movimientos_caja')
        .select('monto')
        .eq('tipo', 'egreso');

        if (error) 
        {
            throw new Error(error.message);
        }    

        if(data)
        {    
            total = data.reduce((total, pago) => total + pago.monto, 0);
        }
        
        return total;          
    }
}
