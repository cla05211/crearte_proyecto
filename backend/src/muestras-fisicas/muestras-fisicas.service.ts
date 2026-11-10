import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { MuestrasFisicasResponseDTO } from './dto/MuestrasFisicasResponse.dto';
import { MuestrasTablaDTO } from './dto/muestrasTabla.dto';

@Injectable()
export class MuestrasFisicasService 
{
    constructor(private sb: SupabaseService){}

    // Solo pedidos que todavía no se entregaron (la tabla crece con cada venta); filtro opcional por promo
    async traerMuestras(promo?: number): Promise<MuestrasTablaDTO[]>
    {
        let query = this.sb.supabase
            .from('muestras_fisicas')
            .select(`id, id_pedido, estado, muestras, envio, fecha_entrega, fecha_devolucion,
                pedido:pedidos!inner(
                    con_senia, estado_general,
                    vendedora:usuarios!pedidos_id_vendedora_fkey ( nombre ),
                    grupo:grupos!inner ( nivel, promo, colegio:colegios ( nombre ) ),
                    cuotas ( numero )
                )
            `)
            // estado_general puede ser null en pedidos viejos
            .or('estado_general.is.null,estado_general.neq.Entregado', { referencedTable: 'pedido' })
            .order('id', { ascending: false });

        if (promo)
        {
            query = query.eq('pedido.grupo.promo', promo);
        }

        const { data, error } = await query;

        if (error) 
        {
            throw new BadRequestException(error.message);
        }  

        const muestras: MuestrasTablaDTO[] = data.map((d) => ({
            muestra: {id: d.id, id_pedido: d.id_pedido, estado: d.estado, muestras: d.muestras, fecha_entrega: d.fecha_entrega, fecha_devolucion: d.fecha_devolucion, envio: d.envio},
            colegio: d.pedido.grupo.colegio.nombre,
            nivel: d.pedido.grupo.nivel!,
            promo: d.pedido.grupo.promo,
            vendedora: d.pedido.vendedora?.nombre!,
            planCuotas: {nroCuotas: d.pedido.cuotas.length, conSenia: d.pedido.con_senia}
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
        // Cargar la fecha de devolución implica que la muestra ya se devolvió
        .update({'fecha_devolucion': fecha, 'estado': 'Devuelto'})
        .eq("id", id)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }

    async modificarEnvio(envio: boolean, id: number):Promise<void>
    {
        const { error } = await this.sb.supabase
        .from("muestras_fisicas")
        .update({'envio': envio})
        .eq("id", id)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }    
}
