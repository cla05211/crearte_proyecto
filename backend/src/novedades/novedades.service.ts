import { Injectable } from '@nestjs/common';
import { GruposService } from 'src/grupos/grupos.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { NovedadDTO } from './dto/Novedad.dto';

@Injectable()
export class NovedadesService 
{
    constructor(private sb:SupabaseService){}

    async obtenerNuevasVentas():Promise<NovedadDTO[]>
    {
        const fechaLimite = this.inicioDiasHabilesAtras(2);

        const { data, error } = await this.sb.supabase
        .from('grupos')
        .select(`id, created_at,
            colegios (nombre)`)
        .gte('created_at', fechaLimite.toISOString())
        .order("created_at", { ascending: true });

        if (error) 
        {
            throw new Error(error.message);
        }    

        const ventas:NovedadDTO[] = data.map(v=>({
            idGrupo: v.id,
            colegio: v.colegios.nombre,
            fecha: v.created_at!
        }));          

        return ventas;
    }

    async obtenerPedidosListosProduccion():Promise<NovedadDTO[]>
    {
        const { data, error } = await this.sb.supabase
        .from('pedidos')
        .select(`estado_general,
            grupos(id,colegios(nombre))`)
        .eq('estado_general', "Listo para enviar a producción");

        if (error) 
        {
            throw new Error(error.message);
        }    

        const pedidos:NovedadDTO[] = data.map(p=>({
            idGrupo: p.grupos.id,
            colegio: p.grupos.colegios.nombre,
        }));          

        return pedidos;
    }

    private inicioDiasHabilesAtras(diasHabiles: number): Date
    {
        const hoyAR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
        const fecha = new Date(`${hoyAR}T00:00:00-03:00`);

        let restantes = diasHabiles;

        while (restantes > 0)
        {
            fecha.setUTCDate(fecha.getUTCDate() - 1);
            const diaSemana = fecha.getUTCDay();
            if (diaSemana !== 0 && diaSemana !== 6) restantes--;
        }

        return fecha;
    }
}
