import { Injectable } from '@nestjs/common';
import { ColegioDTO } from './dto/Colegio.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class ColegiosService 
{
    constructor(private sb: SupabaseService){}

    async crearColegio(dto: ColegioDTO)
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

        return data.id;
    }
}
