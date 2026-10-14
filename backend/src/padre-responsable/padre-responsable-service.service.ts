import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PadreResponsableDTO } from './dto/padreResponsable.dto';
import { BadRequestException } from '@nestjs/common';
import { PadreResponsableResponseDTO } from './dto/padreResponsableResponse.dto';

@Injectable()
export class PadreResponsableService 
{
    constructor(private sb: SupabaseService){}

    async crearPadresResponsables(padres: PadreResponsableDTO[])
    {
        var mensaje = "Exito";

        const { data, error } = await this.sb.supabase
        .from('padres_responsables')
        .insert(padres)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return mensaje;
    }

    async traerPadreResponsables(idGrupo:number):Promise<PadreResponsableDTO>
    {
        const { data, error } = await this.sb.supabase
            .from('padres_responsables')
            .select(`
                *
            `)
            .eq('id_grupo', idGrupo)
            .neq('mail', '')
            .single();

        if (error) 
        {
            throw new Error(error.message);
        }

        return data as PadreResponsableDTO;       
    }

    async traerPadresResponsables(idGrupo:number):Promise<PadreResponsableResponseDTO[]>
    {
        const { data, error } = await this.sb.supabase
            .from('padres_responsables')
            .select(`
                *
            `)
            .eq('id_grupo', idGrupo)
            .order('id', { ascending: true });

        if (error) 
        {
            throw new Error(error.message);
        }

        return data as PadreResponsableResponseDTO[];       
    }

    async subirFirmaPadreResponsable(idPadre: number, idDocumento: number)
    {
        const {data, error} = await this.sb.supabase
            .from('padres_responsables')
            .update({ firma: idDocumento})
            .eq('id', idPadre)

        if (error) 
        {
            throw new InternalServerErrorException(error.message);
        }
    }
}
