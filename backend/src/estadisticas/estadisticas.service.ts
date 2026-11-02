import { BadRequestException, Injectable } from '@nestjs/common';
import { EstadisticasVentasDTO } from './dto/estadisticasVentas.dto';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class EstadisticasService {
    
    constructor(private sb: SupabaseService){}

    async obtenerEstadisticasVentas(): Promise<EstadisticasVentasDTO[]>
    {
        const anio = new Date().getFullYear()

        const {data, error} = await this.sb.supabase
        .from("grupos")
        .select(`
            created_at,nivel,promo,
            colegios(nombre,localidad,provincia),
            pedidos!inner(estado_general,motivo_cancelacion,
            usuarios(nombre),
            productos_pedidos(id_producto_original,cantidad)
            )
        `)
        .or(`and(created_at.gte.${anio}-01-01,created_at.lt.${anio + 1}-01-01),promo.in.(${anio},${anio + 1})`);
        
        if (error)
        {
            throw new BadRequestException(error.message);
        }

        const datos: EstadisticasVentasDTO[] = data.map(g => (
        {
            fechaVenta: g.created_at ?? '',
            promo:g.promo,
            vendedora: g.pedidos[0].usuarios?.nombre ?? 'Sin asignar',
            colegio: g.colegios.nombre,
            nivel: g.nivel!,
            provincia:g.colegios.provincia,
            localidad:g.colegios.localidad,
            nroEgresados: Math.max(...g.pedidos[0].productos_pedidos.map(pp => pp.cantidad)),
            motivoCancelacion: g.pedidos[0].motivo_cancelacion,
            cancelado: g.pedidos[0].estado_general === "Cancelado",
        }))

        return datos;
    }
}
