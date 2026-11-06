import { Injectable } from '@nestjs/common';
import { GruposService } from 'src/grupos/grupos.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { NovedadDTO } from './dto/Novedad.dto';
import { AuditoriasService } from 'src/auditorias/auditorias.service';
import { AuditoriaRegistroDTO, PresupuestoAuditoria } from 'src/auditorias/dto/AuditoriaResponse.dto';

@Injectable()
export class NovedadesService 
{
    constructor(private sb:SupabaseService, private auditoriasSerivce: AuditoriasService){}

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

    // Cambios de presupuesto/plan y de beneficios (salen de la auditoría), con qué se cambió en cada uno
    async obtenerPresupuestosModificados(): Promise<NovedadDTO[]>
    {
        const fechaDesde = this.inicioDiasHabilesAtras(2).toISOString();

        const [presupuestos, beneficios] = await Promise.all([
            this.auditoriasSerivce.listar({ rangoDesde: 0, rangoHasta: 99, tipo: 'presupuesto', fechaDesde }),
            this.auditoriasSerivce.listar({ rangoDesde: 0, rangoHasta: 99, tipo: 'beneficios', fechaDesde }),
        ]);

        return [...presupuestos.registros, ...beneficios.registros]
            .map(r => ({ idGrupo: r.idGrupo, colegio: r.colegio, fecha: r.fecha, cambios: this.detectarCambios(r) }))
            .sort((a, b) => b.fecha.localeCompare(a.fecha));
    }

    // Compara la foto de antes y después del presupuesto para decir qué se cambió:
    // - Plan: cantidad de cuotas, o solo los precios (seña/cuota) sin tocar prendas
    // - Prendas: se agregaron/quitaron productos o cambió alguna cantidad
    // - Agregados: cambió la lista de agregados globales (bandera, etc.)
    private detectarCambios(registro: AuditoriaRegistroDTO): string[]
    {
        if (registro.tipo === 'beneficios') return ['Beneficios'];

        const antes = registro.datoAnterior as PresupuestoAuditoria | null;
        const despues = registro.datoNuevo as PresupuestoAuditoria | null;
        if (!antes || !despues) return ['Presupuesto'];

        const prendas = (p: PresupuestoAuditoria) => JSON.stringify(p.productos.map(x => [x.nombre, x.cantidad]).sort());
        const precios = (p: PresupuestoAuditoria) => JSON.stringify(p.productos.map(x => [x.nombre, x.valorSenia, x.valorCuota]).sort());

        const cambioPrendas = prendas(antes) !== prendas(despues);
        const cambioCuotas = antes.nroCuotas !== despues.nroCuotas;
        const cambioPrecios = precios(antes) !== precios(despues);
        const cambioAgregados = JSON.stringify(antes.agregados) !== JSON.stringify(despues.agregados);

        const cambios: string[] = [];
        // Si cambiaron las prendas, los precios suelen cambiar por el tramo de cantidad: eso no cuenta como cambio de plan
        if (cambioCuotas || (cambioPrecios && !cambioPrendas)) cambios.push('Plan');
        if (cambioPrendas) cambios.push('Prendas');
        if (cambioAgregados) cambios.push('Agregados');

        return cambios.length ? cambios : ['Presupuesto'];
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
