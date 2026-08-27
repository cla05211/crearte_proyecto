import { Injectable } from '@nestjs/common';
import { MovimientoDTO } from './dto/movimiento.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class CuentaCorrienteService 
{
    constructor(private sb: SupabaseService){}


}
