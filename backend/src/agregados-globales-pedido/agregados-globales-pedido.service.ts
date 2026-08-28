import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { AgregadoGlobalPedidoResponseDTO } from './dto/AgregadoGlobalPedidoResponse.dto';

@Injectable()
export class AgregadosGlobalesPedidoService
{
    constructor(private sb: SupabaseService){}

    async obtenerPorPedido(idPedido: number): Promise<AgregadoGlobalPedidoResponseDTO[]>
    {
        const { data, error } = await this.sb.supabase
            .from('agregados_globales_pedido')
            .select('*, agregados(agregado, precio, individual)')
            .eq('id_pedido', idPedido);

        if (error)
        {
            throw new Error(error.message);
        }

        const agregadosGlobales: AgregadoGlobalPedidoResponseDTO[] = data.map(a => ({
            id: a.id,
            id_pedido: a.id_pedido!,
            id_agregado: a.id_agregado!,
            agregado: a.agregados!.agregado!,
            precio: a.agregados!.precio!,
            individual: a.agregados!.individual!,
        }));

        return agregadosGlobales;
    }
}
