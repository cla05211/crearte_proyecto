import { Injectable } from '@nestjs/common';
import { DocumentoDTO } from './dto/documento.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class DocumentosService 
{
    constructor(private sb: SupabaseService){}

    async subirDocumento(dto: DocumentoDTO | DocumentoDTO[])
    {
        const {data,error} = await this.sb.supabase
            .from('documentos')
            .insert(dto)
            .select('id')

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data.map(d => d.id);
    } 
    
    // Devuelve el documento más reciente de ese tipo para el grupo, o null si no hay ninguno
    async obtenerDocumentoPorTipo(idGrupo: number, tipo: string)
    {
        const { data, error } = await this.sb.supabase
            .from('documentos')
            .select('id, archivo_url, created_at')
            .eq('id_grupo', idGrupo)
            .eq('tipo', tipo)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        return data;
    }

    async obtenerArchivoUrl(idArchivo:number)
    {
        const { data, error } = await this.sb.supabase
            .from('documentos')
            .select(`
                archivo_url
            `)
            .eq('id', idArchivo)
            .single();

        if (error) 
        {
            throw new Error(error.message);
        }

        return data.archivo_url;
    }
}
