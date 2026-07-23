import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { GrupoDTO } from './dto/grupo.dto';
import { BadRequestException } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';

@Injectable()
export class GruposService 
{
    constructor(private sb: SupabaseService){}
    
    async crearGrupo(dto: GrupoDTO)
    {
        const {data,error} = await this.sb.supabase
            .from('grupos')
            .insert(dto)
            .select('id')
            .single();

        if (error) 
        {
            switch (error.code) 
            {
            case 'SIGNUP_ERROR':
                throw new ConflictException({
                    code: 'GROUP_ALREADY_EXISTS',
                    message: 'El grupo que esta intentando ingresar ya ha sido registrado en el sistema.',
                });
            default:
                throw new BadRequestException({
                    code: 'ERROR',
                    message: error.message,
                });
            }
        }

        return data.id;
    }
}
