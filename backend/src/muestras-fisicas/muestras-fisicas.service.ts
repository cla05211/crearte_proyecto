import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { MuestrasFisicasResponseDTO } from './dto/MuestrasFisicasResponse.dto';

@Injectable()
export class MuestrasFisicasService 
{
    constructor(private sb: SupabaseService){}

    async traerMuestras(): Promise<MuestrasFisicasResponseDTO[]>
    {
        const { data, error } = await this.sb.supabase
        .from("muestras_fisicas")
        .select('*')

        if (error) 
        {
            throw new BadRequestException(error.message);
        }  

        return data.map((d)=> d as MuestrasFisicasResponseDTO)
    }

    async modificarMuestras(muestras: string, id: number):Promise<void>
    {
        const { data, error } = await this.sb.supabase
        .from("muestras_fisicas")
        .update({'muestras': muestras})
        .eq("id", id)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }    

    async modificarEstado(nuevoEstado: string, id: number):Promise<void>
    {
        const { data, error } = await this.sb.supabase
        .from("muestras_fisicas")
        .update({'estado': nuevoEstado})
        .eq("id", id)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }    

    async modficarFechaEntrega(fecha: string, id: number):Promise<void>
    {
        const { data, error } = await this.sb.supabase
        .from("muestras_fisicas")
        .update({'fecha_entrega': fecha})
        .eq("id", id)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }    

    async modficarFechaDevolucion(fecha: string, id: number):Promise<void>
    {
        const { data, error } = await this.sb.supabase
        .from("muestras_fisicas")
        .update({'fecha_devolucion': fecha})
        .eq("id", id)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }    
}
