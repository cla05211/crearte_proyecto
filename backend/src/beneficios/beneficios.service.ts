import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class BeneficiosService 
{
    constructor(private sb: SupabaseService){}

    async traerBeneficiosDisponibles():Promise<string[]>
    {
        const { data, error } = await this.sb.supabase
        .from('beneficios')
        .select('beneficio')

        if (error) 
        {
            throw new Error(error.message);
        }

        return data.map(d => d.beneficio);
    }
}

