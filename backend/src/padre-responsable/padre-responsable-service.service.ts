import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PadreResponsableDTO } from './dto/padreResponsable.dto';
import { BadRequestException } from '@nestjs/common';

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

    async traerPadreResponsables(id:number):Promise<PadreResponsableDTO>
    {
        const { data, error } = await this.sb.supabase
            .from('padres_responsables')
            .select(`
                *
            `)
            .eq('id_grupo', id)
            .neq('mail', '')
            .single();

        if (error) 
        {
            throw new Error(error.message);
        }

        return data as PadreResponsableDTO;       
    }
}
