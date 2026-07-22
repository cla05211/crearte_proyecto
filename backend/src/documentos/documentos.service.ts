import { Injectable } from '@nestjs/common';
import { DocumentoDTO } from './dto/documento.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';
import { PagoDocumentoDTO } from './dto/PagoDocumento.dto';

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

    async subirDocumentoPago(dto: PagoDocumentoDTO)
    {
        const {data,error} = await this.sb.supabase
        .from('pagos_documentos')
        .insert(dto)
        .select('id')

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data.map(d => d.id);
    }
}
