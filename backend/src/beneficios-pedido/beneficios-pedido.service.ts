import { BadRequestException, Injectable } from '@nestjs/common';
import { BeneficioPedidoDTO } from './dto/beneficioPedidoDTO';
import { SupabaseService } from 'src/supabase/supabase.service';
import { Json } from 'src/types/supabase';

@Injectable()
export class BeneficiosPedidoService 
{
    constructor(private sb: SupabaseService){}

    async traerBeneficiosPedido(idPedido:number):Promise<BeneficioPedidoDTO[]>
    {
        const { data, error } = await this.sb.supabase
        .from('beneficios_pedido')
        .select('id_beneficio, cantidad, beneficios(beneficio, id_producto)')
        .eq('id_pedido', idPedido)

        if (error) 
        {
            throw new Error(error.message);
        }

        const beneficios = data.map((b):BeneficioPedidoDTO => ({id_beneficio: b.id_beneficio, cantidad: b.cantidad, 
            beneficio: b.beneficios?.beneficio ?? '',
            id_producto: b.beneficios?.id_producto ?? null}))

        return beneficios
    }

    async modificarBeneficios(idPedido: number, nuevosBeneficios: BeneficioPedidoDTO[])
    {
        const { error } = await this.sb.supabase.rpc('modificar_beneficios_pedido', {
            p_id_pedido: idPedido,
            p_beneficios: nuevosBeneficios as unknown as Json,
        });

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        return { nuevosBeneficios };
    }
}
