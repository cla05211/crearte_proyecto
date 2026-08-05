import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';
import { PagoDTO } from './dto/pago.dto';
import { PagoResponseDTO } from './dto/pagoResponse.dto';

@Injectable()
export class PagosService 
{
    constructor(private sb: SupabaseService){}

    async crearPago(dto: PagoDTO)
    {
        const {data,error} = await this.sb.supabase
            .from('pagos')
            .insert(dto)
            .select('id')
            .single();

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data.id;
    }    

    async traerPagosPedido(idPedido: number):Promise<PagoResponseDTO[]>
    {
        const { data, error } = await this.sb.supabase
            .from('pagos')
            .select(`*`)
            .eq('id_pedido', idPedido)

        if (error) 
        {
            throw new Error(error.message);
        }        

        return data as PagoResponseDTO[];
    }
}
