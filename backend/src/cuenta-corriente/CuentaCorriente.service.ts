import { Injectable } from '@nestjs/common';
import { MovimientoDTO } from './dto/movimiento.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class CuentaCorrienteService 
{
    constructor(private sb: SupabaseService){}

    async crearMovimiento(dto:MovimientoDTO)
    {
        const {data,error} = await this.sb.supabase
            .from('movimientos')
            .insert(dto);
        
        if (error) 
        {
            throw new BadRequestException(error.message);
        }            
    }
}
