import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { GrupoDTO } from './dto/grupo.dto';
import { BadRequestException } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { grupoClientePageResponseDTO } from './dto/grupoClientePage.dto copy';
import { grupoDatosClienteResponse } from './dto/grupoClienteDatosPage.dto';
import { AuthService } from 'src/auth/auth.service';
import { colegioDeudorDTO } from './dto/colegioDeudor.dto';

import { calcularSeniaTotal } from 'src/pagos/estadoSeña.util';

@Injectable()
export class GruposService 
{
    constructor(private sb: SupabaseService){}
    
    async crearGrupo(dto: GrupoDTO)
    {
        const {data,error} = await this.sb.supabase
            .from('grupos')
            .insert(dto)
            .select('id')
            .single();

        if (error) 
        {
            switch (error.code) 
            {
            case 'SIGNUP_ERROR':
                throw new ConflictException({
                    code: 'GROUP_ALREADY_EXISTS',
                    message: 'El grupo que esta intentando ingresar ya ha sido registrado en el sistema.',
                });
            default:
                throw new BadRequestException({
                    code: 'ERROR',
                    message: error.message,
                });
            }
        }

        return data.id;
    }

    async traerGruposClientePage(rangoDesde: number, rangoHasta:number, esFabrica:boolean, busqueda?:string, mes?: number, anio?: number):Promise<grupoClientePageResponseDTO[]>
    {
        const query = this.consultaGruposClientes(false, esFabrica, busqueda, mes, anio);

        const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(rangoDesde, rangoHasta);

        if (error) 
        {
            throw new Error(error.message);
        }
   
        const gruposClientes: grupoClientePageResponseDTO[] = data.filter(grupo => grupo.padres_responsables[0]?.nombre && grupo.padres_responsables[0]?.apellido)
        .map(grupo => 
            ({
                idGrupo: grupo.id!,
                colegio: {nombre:grupo.colegios.nombre, localidad: grupo.colegios.localidad, provincia: grupo.colegios.provincia, zona_sur: grupo.colegios.zona_sur},
                nroFabrica:grupo.pedidos[0].nro_fabrica,
                nivel: grupo.nivel!,
                padreResponsableNombre:grupo.padres_responsables[0].nombre ?? '',
                padreResponsableApellido:grupo.padres_responsables[0].apellido ?? '',
                contacto:grupo.padres_responsables.filter(p=> p.principal == true)[0].telefono!,
                orientacion: grupo.orientacion!,
                turno: grupo.turno!,
                fechaVenta: grupo.created_at!,
                estadoPedido: grupo.pedidos[0].estado_general,
            }))
        return gruposClientes;
    }

    // Contador "Colegios" de la página Clientes: mismos filtros que el listado
    async contarGruposClientePage(esFabrica:boolean, busqueda?:string, mes?: number, anio?: number): Promise<number>
    {
        const { count, error } = await this.consultaGruposClientes(true, esFabrica, busqueda, mes, anio);

        if (error)
        {
            throw new Error(error.message);
        }

        return count ?? 0;
    }

    // Listado de Clientes. Período por fecha de venta (created_at del grupo) en hora de Argentina:
    // con año y mes, ese mes; solo año, el año entero; sin año, sin filtro de fecha.
    private consultaGruposClientes(soloContar: boolean, esFabrica: boolean, busqueda?: string, mes?: number, anio?: number)
    {
        let query = this.sb.supabase
        .from("grupos")
        .select(
            `id,nivel,orientacion,turno,created_at,colegios!inner (nombre, localidad, provincia, zona_sur),padres_responsables!inner (nombre, apellido, telefono, principal), pedidos!inner(nro_fabrica, estado_general)`,
            soloContar ? { count: 'exact', head: true } : undefined,
        )
        .eq('padres_responsables.principal', true)
        .not('padres_responsables.nombre', 'is', null)
        .not('padres_responsables.apellido', 'is', null);

        if(busqueda)
        {
            query = query.ilike('colegios.nombre', `%${busqueda}%`);
        }

        if(esFabrica)
        {
            query = query.eq('pedidos.estado_general', 'En producción');
        }

        if (anio)
        {
            const desde = mes ? this.inicioMesArgentina(anio, mes) : this.inicioMesArgentina(anio, 1);
            const hasta = mes
                ? (mes === 12 ? this.inicioMesArgentina(anio + 1, 1) : this.inicioMesArgentina(anio, mes + 1))
                : this.inicioMesArgentina(anio + 1, 1);
            query = query.gte('created_at', desde).lt('created_at', hasta);
        }

        return query;
    }

    private inicioMesArgentina(anio: number, mes: number): string
    {
        return `${anio}-${String(mes).padStart(2, '0')}-01T00:00:00-03:00`;
    }

    async traerCantidadEgresados(idGrupo: number)
    {
        const { data, error } = await this.sb.supabase
        .from("grupos")
        .select(`cantidad_egresados`)
        .eq('id', idGrupo)
        .single();

        if (error) throw new Error(error.message);

        return data?.cantidad_egresados;
    }

    async traerDatosGrupoClientePage(idGrupo:number):Promise<grupoDatosClienteResponse>
    {
        const { data: grupo, error: errGrupo } = await this.sb.supabase
            .from("grupos")
            .select(`*, colegios!inner (nombre, localidad, provincia, zona_sur)`)
            .eq('id', idGrupo)
            .single();

        if (errGrupo) throw new Error(errGrupo.message);

        const { data: padresResponsables, error: errPadres } = await this.sb.supabase
            .from("padres_responsables")
            .select('*')
            .eq('id_grupo', idGrupo)
            .order('id', { ascending: true });

        if (errPadres) throw new Error(errPadres.message);

        const { data: alumnosResponsables, error: errAlumnos } = await this.sb.supabase
            .from("alumnos_responsables")
            .select('*')
            .eq('id_grupo', idGrupo);

        if (errAlumnos) throw new Error(errAlumnos.message);

        // Usuario del portal de clientes (la contraseña no se devuelve nunca)
        const { data: cliente, error: errCliente } = await this.sb.supabase
            .from("clientes")
            .select('usuario')
            .eq('id_grupo', idGrupo)
            .maybeSingle();

        if (errCliente) throw new Error(errCliente.message);

        return {
            grupo: {
            id_colegio: grupo.id_colegio,
            orientacion: grupo.orientacion,
            turno: grupo.turno,
            nivel: grupo.nivel,
            promo: grupo.promo,
            cantidad_egresados: grupo.cantidad_egresados,
            colegio: {nombre: grupo.colegios.nombre, localidad: grupo.colegios.localidad, provincia: grupo.colegios.provincia, zona_sur: grupo.colegios.zona_sur}
            },
            padresResponsables,
            alumnosResponsables,
            usuario: cliente?.usuario.trim() ?? null,
            fechaVenta: grupo.created_at!
        };

    }

    async determinarSecundaria(idGrupo: number):Promise<boolean>
    {
        let secundaria = false;

        const {data, error} = await this.sb.supabase
            .from("grupos")
            .select(`nivel`)
            .eq('id', idGrupo)
            .single();
        
        if (data?.nivel == "Secundaria")
        {
            secundaria = true;
        }

        return secundaria;
    }

    // Marca el contrato del grupo como firmado (lo usa el recordatorio de contrato para cancelarse).
    async marcarContratoFirmado(idGrupo: number, fechaFirma: string)
    {
        const { data: existente, error: errorBusqueda } = await this.sb.supabase
            .from('contratos')
            .select('id')
            .eq('grupo', idGrupo)
            .limit(1)
            .maybeSingle();

        if (errorBusqueda) throw new BadRequestException(errorBusqueda.message);

        const { error } = existente
            ? await this.sb.supabase.from('contratos').update({ firmado: true, fecha_firma: fechaFirma }).eq('id', existente.id)
            : await this.sb.supabase.from('contratos').insert({ grupo: idGrupo, firmado: true, fecha_firma: fechaFirma });

        if (error) throw new BadRequestException(error.message);
    }

    //Deudores
    async traerGruposDeudores(): Promise<colegioDeudorDTO[]>
    {
        const fechaHoy = this.fechaArgentina(new Date());

        // cuotasVencidas: solo las vencidas sin pagar. cuotas: todas, para saber de cuántas cuotas es el plan.
        // Sin !inner en las cuotas: un grupo que solo debe la seña (todavía sin cuotas vencidas) también tiene que venir.
        const { data, error } = await this.sb.supabase
        .from("grupos")
        .select(`id, created_at, colegios(nombre),
            pedidos!inner(nro_fabrica, senia_total,
                cuotas(id),
                cuotasVencidas:cuotas(importe,monto_cubierto,fecha_vencimiento,estado),
                productos_pedidos(valor_senia,cantidad),
                pagos(monto,motivo)),
            padres_responsables(nombre,apellido,telefono,principal)`)
        // Los colegios dados de baja no son deudores (estado_general puede ser null en pedidos viejos)
        .or('estado_general.is.null,estado_general.neq.Cancelado', { referencedTable: 'pedidos' })
        .neq('pedidos.cuotasVencidas.estado', 'Pagada')
        .lt('pedidos.cuotasVencidas.fecha_vencimiento', fechaHoy)
        .eq('pedidos.pagos.motivo', 'Seña');

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        const planesConSenia = await this.obtenerPlanesConSenia();
        const colegiosDeudores: colegioDeudorDTO[] = [];

        for (const g of data)
        {
            const pedido = g.pedidos[0];
            const cuotasVencidas = pedido.cuotasVencidas;

            // Si el plan es de cuotas iguales, la "seña" es en realidad la primera cuota y lo que falte cuenta como deuda.
            // Si es una seña real (seña != cuota), no se toma como deuda.
            const seniaEsPrimeraCuota = !(planesConSenia.get(pedido.cuotas.length) ?? true);
            const deudaSenia = seniaEsPrimeraCuota ? this.calcularDeudaSenia(pedido.productos_pedidos, pedido.pagos, pedido.senia_total) : 0;

            if (cuotasVencidas.length === 0 && deudaSenia === 0)
            {
                continue;
            }

            const deudaCuotas = (cuotasVencidas.reduce((acumulador, cuota) => acumulador + (cuota.importe ?? 0),0)) - (cuotasVencidas.reduce((acumulador, cuota) => acumulador + (cuota.monto_cubierto ?? 0),0));

            // La seña se paga el día de la venta (cuando se crea el grupo), así que si se debe es lo más atrasado
            const diasAtraso = deudaSenia > 0 && g.created_at
                ? this.diasEntre(this.fechaArgentina(new Date(g.created_at + 'Z')), fechaHoy)
                : this.calcularDiasAtraso(fechaHoy, cuotasVencidas);

            colegiosDeudores.push({
                idGrupo: g.id,
                nroFabrica: pedido.nro_fabrica,
                colegio: g.colegios.nombre,
                nroCuotasAdeudadas: cuotasVencidas.length + (deudaSenia > 0 ? 1 : 0),
                montoAdeudado: deudaCuotas + deudaSenia,
                deudaSenia: deudaSenia,
                seniaEsPrimeraCuota: seniaEsPrimeraCuota,
                padreResponsable: `${g.padres_responsables.filter(p=> p.principal == true)[0].nombre!} ${g.padres_responsables.filter(p=> p.principal == true)[0].apellido!}`,
                contacto: g.padres_responsables.filter(p=> p.principal == true)[0].telefono!,
                diasAtraso: diasAtraso
            });
        }
        
        return colegiosDeudores
    }

    // Seña acordada (senia_total o valor_senia * cantidad de cada producto) menos lo pagado con motivo 'Seña'.
    // Mismo cálculo que registrar_pago_completo / cuenta corriente.
    private calcularDeudaSenia(productos: {valor_senia:number,cantidad:number}[], pagosSenia: {monto:number|null}[], seniaGuardada: number | null): number
    {
        const totalSenia = calcularSeniaTotal(seniaGuardada, productos);
        const seniaPagada = pagosSenia.reduce((acumulador, pago) => acumulador + (pago.monto ?? 0), 0);
        const deuda = Math.round((totalSenia - seniaPagada) * 100) / 100;

        return deuda > 0 ? deuda : 0;
    }

    // Copia de obtenerPlanesConSenia de gestion-pedidos: si un plan (cantidad de cuotas) tiene seña distinta a la cuota.
    // Se saca del catálogo y no del pedido, porque en el pedido la cuota incluye los agregados individuales
    // y un plan de cuotas iguales quedaría con seña != cuota.
    private async obtenerPlanesConSenia(): Promise<Map<number, boolean>>
    {
        const { data, error } = await this.sb.supabase
        .from("precios_productos")
        .select("cuotas, valor_senia, valor_cuota");

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        const planes = new Map<number, boolean>();
        for (const precio of data)
        {
            const conSenia = Number(precio.valor_senia) !== Number(precio.valor_cuota);
            planes.set(precio.cuotas, (planes.get(precio.cuotas) ?? false) || conSenia);
        }
        return planes;
    }

    private calcularDiasAtraso(fechaHoy:string, cuotas:{estado:string|null,fecha_vencimiento:string|null}[])
    {
        const primeraCuotaVencida = cuotas
        .filter(cuota => cuota.estado !== 'Pagada')
        .sort((a, b) => a.fecha_vencimiento!.localeCompare(b.fecha_vencimiento!))[0];

        return primeraCuotaVencida ? this.diasEntre(primeraCuotaVencida.fecha_vencimiento!, fechaHoy) : 0;
    }

    // Días entre dos fechas 'YYYY-MM-DD' (en UTC para que el horario de verano no corra un día)
    private diasEntre(desde: string, hasta: string): number
    {
        return Math.floor(
            (new Date(hasta + 'T00:00:00Z').getTime() - new Date(desde + 'T00:00:00Z').getTime())
            / (1000 * 60 * 60 * 24)
        );
    }

    // Fecha 'YYYY-MM-DD' en horario argentino
    private fechaArgentina(fecha: Date): string
    {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(fecha);
    }
}
