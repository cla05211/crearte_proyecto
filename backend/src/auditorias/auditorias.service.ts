import { Injectable } from '@nestjs/common';
import { insertarAuditoriaDTO } from './dto/insertarAuditoria.dto';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class AuditoriasService 
{
    constructor(private sb: SupabaseService){}

    async registrar(dto: insertarAuditoriaDTO)
    {
        const { data, error } = await this.sb.supabase
        .from('auditoria')
        .insert(dto)

        if (error) 
        {
            throw new Error(error.message);
        }
    }
}
