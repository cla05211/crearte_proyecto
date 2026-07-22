import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';
import { PagoDTO } from './dto/pago.dto';

@Injectable()
export class PagosService 
{
    constructor(private sb: SupabaseService){}

    async crearPago(dto: PagoDTO)
    {
        console.log('DTO recibido:', dto);
        const {data,error} = await this.sb.supabase
            .from('pagos')
            .insert(dto)
            .select('id')
            .single();

        console.log('Resultado Supabase:', data);
        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data.id;
    }    
}
