import { Injectable } from '@nestjs/common';
import { ColegioDTO } from './dto/Colegio.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';
import { ColegioSBDTO } from './dto/ColegioSB.dto';
import { count } from 'console';
import { ConflictException } from '@nestjs/common';

@Injectable()
export class ColegiosService 
{
    constructor(private sb: SupabaseService){}

    async crearColegio(dto: ColegioDTO)
    {
        const coincidencia = await this.traerColegio(dto.nombre, dto.localidad);
        let colegioID = 0;

        if(coincidencia != null)
        {
            colegioID = coincidencia.id;
        }
        else
        {
            const {data,error} = await this.sb.supabase
            .from('colegios')
            .insert(dto)
            .select('id')
            .single();

            if (error) 
            {
                throw new BadRequestException(error.message);
            }

            colegioID = data.id;
        }
        return colegioID;
    }

    async traerColegio(nombre:string, localidad:string):Promise<ColegioSBDTO| null> 
    {
        const { data, error } = await this.sb.supabase
            .from('colegios')
            .select(`
                *
            `)
            .eq('nombre', nombre)
            .eq('localidad', localidad)
            .maybeSingle();

        if (error) 
        {
            throw new Error(error.message);
        }

        return data
    }
}
