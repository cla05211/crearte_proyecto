import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BeneficioResponseDTO } from './dto/beneficioResponse.dto';
import { Json } from 'src/types/supabase';

@Injectable()
export class BeneficiosService 
{
    constructor(private sb: SupabaseService){}

    async traerBeneficiosDisponibles():Promise<BeneficioResponseDTO[]>
    {
        const { data, error } = await this.sb.supabase
        .from('beneficios')
        .select('*')

        if (error) 
        {
            throw new Error(error.message);
        }

        return data as BeneficioResponseDTO[]
    }
}

