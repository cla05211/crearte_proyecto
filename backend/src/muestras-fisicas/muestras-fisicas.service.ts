import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { MuestrasFisicasResponseDTO } from './dto/MuestrasFisicasResponse.dto';
import { MuestrasTablaDTO } from './dto/muestrasTabla.dto';

@Injectable()
export class MuestrasFisicasService 
{
    constructor(private sb: SupabaseService){}

    async traerMuestras(): Promise<MuestrasTablaDTO[]>
    {
        const { data, error } = await this.sb.supabase
            .from('muestras_fisicas')
            .select(`id, id_pedido, estado, muestras, fecha_entrega, fecha_devolucion,
                pedido:pedidos!inner(
                    vendedora:usuarios!pedidos_id_vendedora_fkey ( nombre ),
                    grupo:grupos ( nivel, colegio:colegios ( nombre ) ),
                    cuotas ( numero ),
                    productos_pedidos ( cantidad, valor_senia, valor_cuota )
                )
            `)
            .order('id', { ascending: false });

        if (error) 
        {
            throw new BadRequestException(error.message);
        }  

        const muestras: MuestrasTablaDTO[] = data.map((d) => ({
            muestra: {id: d.id, id_pedido: d.id_pedido, estado: d.estado, muestras: d.muestras, fecha_entrega: d.fecha_entrega, fecha_devolucion: d.fecha_devolucion},
            colegio: d.pedido.grupo.colegio.nombre,
            nivel: d.pedido.grupo.nivel!,
            vendedora: d.pedido.vendedora?.nombre!,
            planCuotas: {nroCuotas: d.pedido.cuotas.length, importeCuota: d.pedido.productos_pedidos[0].valor_cuota, senia: d.pedido.productos_pedidos[0].valor_senia}
        }))

        return muestras
    }

    async modificarMuestras(muestras: string, id: number):Promise<void>
    {
        const { data, error } = await this.sb.supabase
        .from("muestras_fisicas")
        .update({'muestras': muestras})
        .eq("id", id)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }    

    async modificarEstado(nuevoEstado: string, id: number):Promise<void>
    {
        const { data, error } = await this.sb.supabase
        .from("muestras_fisicas")
        .update({'estado': nuevoEstado})
        .eq("id", id)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }    

    async modificarFechaEntrega(fecha: string, id: number):Promise<void>
    {
        const { data, error } = await this.sb.supabase
        .from("muestras_fisicas")
        .update({'fecha_entrega': fecha})
        .eq("id", id)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }    

    async modificarFechaDevolucion(fecha: string, id: number):Promise<void>
    {
        const { data, error } = await this.sb.supabase
        .from("muestras_fisicas")
        .update({'fecha_devolucion': fecha})
        .eq("id", id)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }    
}
