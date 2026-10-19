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
            .eq('principal', true)
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

    async modificarPadrePrincipal(idNuevoPadrePrincipal:number, idGrupo:number)
    {
        try 
        {
            await this.borrarPadrePrincipal(idGrupo);
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
            .from('padres_responsables')
            .update({'principal': true})
            .eq('id_grupo',idGrupo)
            .eq('id',idNuevoPadrePrincipal)

        if (error) 
        {
            throw new Error(error.message);
        }   

        return data;
    }

    private async borrarPadrePrincipal(idGrupo:number)
    {
        const {data,error}= await this.sb.supabase
            .from('padres_responsables')
            .update({'principal': false})
            .eq('id_grupo',idGrupo)

        if (error) 
        {
            throw new Error(error.message);
        }   
    }
}
