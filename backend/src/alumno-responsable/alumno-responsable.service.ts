import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { alumnoResponsableDTO } from './dto/alumnoResponsable.dto';
import { alumnoResponsableResponseDTO } from './dto/alumnoResponsableResponse.dto';

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

    async traerAlumnosResponsables(idGrupo:number):Promise<alumnoResponsableResponseDTO[]>
    {
        const {data,error}= await this.sb.supabase
            .from('alumnos_responsables')
            .select('*')
            .eq('id_grupo',idGrupo)
            .order('id')

        if (error) 
        {
            throw new BadRequestException(error.message);
        }   

        return data as alumnoResponsableResponseDTO[];
    }

    async modificarAlumnoPrincipal(idNuevoAlumnoPrincipal:number, idGrupo:number)
    {
        try 
        {
            await this.borrarAlumnoPrincipal(idGrupo);
        } 
        catch (error: unknown) 
        {
            if (error instanceof Error) 
            {
                throw new Error(error.message);
            }

            throw error;
        }

        const {data,error}= await this.sb.supabase
            .from('alumnos_responsables')
            .update({'principal': true})
            .eq('id_grupo',idGrupo)
            .eq('id',idNuevoAlumnoPrincipal)
            .select('*')
            .single()

        if (error) 
        {
            throw new Error(error.message);
        }   

        return data;
    }

    private async borrarAlumnoPrincipal(idGrupo:number)
    {
        const {data,error}= await this.sb.supabase
            .from('alumnos_responsables')
            .update({'principal': false})
            .eq('id_grupo',idGrupo)

        if (error) 
        {
            throw new Error(error.message);
        }   
    }
}
