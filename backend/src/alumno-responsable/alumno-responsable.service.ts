import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { alumnoResponsableDTO } from './dto/alumnoResponsable.dto';

@Injectable()
export class AlumnoResponsableService 
{
    constructor(private sb: SupabaseService){}

    async crearAlumnosResponsables(alumnos: alumnoResponsableDTO[])
    {
        var mensaje = "Exito";

        const { data, error } = await this.sb.supabase
        .from('alumnos_responsables')
        .insert(alumnos)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return mensaje;
    }
}
