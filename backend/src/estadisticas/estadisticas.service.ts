import { ESTADO_PEDIDO_CANCELADO } from 'src/pedidos/pedidos.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { EstadisticasVentasDTO } from './dto/estadisticasVentas.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { EstadisticasProduccionDTO } from './dto/estadisticasProduccion.dto';
import { IDS_BUZO, IDS_CAMPERA, IDS_CHOMBA, IDS_REMERA } from 'src/productos/ids-prendas';
import { EstadisticasBancosDTO } from './dto/estadisticasBancos.dto';
import { EstadisticasCobranzasDTO } from './dto/estadisticasCobranzas.dto';
import { calcularSeniaTotal } from 'src/pagos/estadoSeña.util';

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

    async obtenerEstadisticasProduccion(): Promise<EstadisticasProduccionDTO[]>
    {
        const IDS_PRENDA = {
            buzos: IDS_BUZO,
            camperas: IDS_CAMPERA,
            remeras: IDS_REMERA,
            chombas: IDS_CHOMBA,
            pantalones: [72],
        };
        const ESTADOS_EN_PRODUCCION = ['En producción', 'Listo para entregar', 'Entregado'];

        const anio = new Date().getFullYear();

        const { data, error } = await this.sb.supabase
        .from("grupos")
        .select(`
            created_at,
            pedidos!inner(estado_general,
                productos_pedidos(id_producto_original,cantidad),
                banderas_pedido(origen,enviado_produccion)
            )
        `)
        .gte('created_at', `${anio}-01-01`)
        .lt('created_at', `${anio + 1}-01-01`)
        // Los cancelados no cuentan como vendidos (con !inner, el grupo queda afuera)
        .or(`estado_general.is.null,estado_general.neq.${ESTADO_PEDIDO_CANCELADO}`, { referencedTable: 'pedidos' });

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        return data.map(g =>
        {
            const pedido = g.pedidos[0];
            const enProduccion = ESTADOS_EN_PRODUCCION.includes(pedido.estado_general ?? '');
            const productos = enProduccion ? pedido.productos_pedidos : [];

            return {
                fechaVenta: g.created_at ?? '',
                enviadoProduccion: enProduccion,
                prendas: {
                    buzos: this.sumarCantidades(productos, IDS_PRENDA.buzos),
                    camperas: this.sumarCantidades(productos, IDS_PRENDA.camperas),
                    remeras: this.sumarCantidades(productos, IDS_PRENDA.remeras),
                    chombas: this.sumarCantidades(productos, IDS_PRENDA.chombas),
                    pantalones: this.sumarCantidades(productos, IDS_PRENDA.pantalones),
                },
                banderasProduccion: pedido.banderas_pedido.filter(b => b.enviado_produccion).length,
                banderasBeneficio: pedido.banderas_pedido.filter(b => b.origen === 'Beneficio').length,
            };
        });
    }

    async obtenerEstadisticasBancos():Promise<EstadisticasBancosDTO>
    {
        const anio = new Date().getFullYear()

        const { data, error } = await this.sb.supabase
        .from("pagos")
        .select(`monto, banco,fecha`)
        .in("banco", ["COMAFI", "Santander"])
        .gte("fecha", `${anio}-01-01`)
        .lt("fecha", `${anio + 1}-01-01`);

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        const datos: EstadisticasBancosDTO = {
            facturacionCOMAFI: data.filter(p => p.banco == "COMAFI").reduce((total, p) => total + (p.monto ?? 0), 0),
            facturacionSantander: data.filter(p => p.banco == "Santander").reduce((total, p) => total + (p.monto ?? 0), 0),
        };

        return datos
    }

    async obtenerEstadisticasCobranzas(): Promise<EstadisticasCobranzasDTO[]>
    {
        const anio = new Date().getFullYear();

        const { data, error } = await this.sb.supabase
        .from("grupos")
        .select(`
            created_at,
            pedidos!inner(estado_general,senia_total,
                productos_pedidos(valor_senia,cantidad),
                cuotas(importe,monto_cubierto,fecha_vencimiento,estado),
                pagos(monto,motivo)
            )
        `);

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        const datos: EstadisticasCobranzasDTO[] = data.map(g =>
        {
            const pedido = g.pedidos[0];
            const fechaVenta = g.created_at ?? '';
            const cancelado = pedido.estado_general === ESTADO_PEDIDO_CANCELADO;
            const vendidoEsteAnio = fechaVenta.startsWith(`${anio}-`);

            const deudaPorMes: number[] = new Array(12).fill(0);
            let deudaAnterior = 0;

            // Un cancelado ya no debe nada
            if (!cancelado)
            {
                // La seña se paga el día de la venta: si falta, se cuenta en el mes en que se vendió
                const deudaSenia = this.calcularDeudaSenia(pedido.senia_total, pedido.productos_pedidos, pedido.pagos);
                const deudas = [
                    { fecha: fechaVenta, monto: deudaSenia },
                    ...pedido.cuotas.map(c => ({ fecha: c.fecha_vencimiento ?? '', monto: this.calcularDeudaCuota(c) })),
                ];

                for (const deuda of deudas)
                {
                    const anioDeuda = Number(deuda.fecha.slice(0, 4));

                    if (anioDeuda === anio)
                    {
                        deudaPorMes[Number(deuda.fecha.slice(5, 7)) - 1] += deuda.monto;
                    }
                    else if (anioDeuda < anio)
                    {
                        deudaAnterior += deuda.monto;
                    }
                }
            }

            return {
                fechaVenta: fechaVenta,
                cancelado: cancelado,
                facturacion: vendidoEsteAnio ? this.calcularFacturacion(pedido, cancelado) : 0,
                deudaPorMes: deudaPorMes,
                deudaAnterior: deudaAnterior,
            };
        });

        // Solo los colegios que aportan algo a este año
        return datos.filter(d => d.facturacion !== 0 || d.deudaAnterior > 0 || d.deudaPorMes.some(m => m > 0));
    }

    private calcularFacturacion(
        pedido: { senia_total: number | null; productos_pedidos: { valor_senia: number; cantidad: number }[]; cuotas: { importe: number | null }[]; pagos: { monto: number | null }[] },
        cancelado: boolean): number
    {
        if (cancelado)
        {
            return pedido.pagos.reduce((total, p) => total + (p.monto ?? 0), 0);
        }

        const totalSenia = calcularSeniaTotal(pedido.senia_total, pedido.productos_pedidos);
        const totalCuotas = pedido.cuotas.reduce((total, c) => total + (c.importe ?? 0), 0);

        return totalSenia + totalCuotas;
    }

    private calcularDeudaSenia(seniaGuardada: number | null, productos: { valor_senia: number; cantidad: number }[], pagos: { monto: number | null; motivo: string | null }[]): number
    {
        const totalSenia = calcularSeniaTotal(seniaGuardada, productos);
        const seniaPagada = pagos
            .filter(p => p.motivo === 'Seña')
            .reduce((total, p) => total + (p.monto ?? 0), 0);

        return Math.max(0, Math.round((totalSenia - seniaPagada) * 100) / 100);
    }

    private calcularDeudaCuota(cuota: { importe: number | null; monto_cubierto: number; estado: string | null }): number
    {
        if (cuota.estado === 'Pagada')
        {
            return 0;
        }

        return Math.max(0, (cuota.importe ?? 0) - (cuota.monto_cubierto ?? 0));
    }

    private sumarCantidades(productos: { id_producto_original: number; cantidad: number }[], ids: number[]): number
    {
        return productos
            .filter(pp => ids.includes(pp.id_producto_original))
            .reduce((total, pp) => total + pp.cantidad, 0);
    }
}
