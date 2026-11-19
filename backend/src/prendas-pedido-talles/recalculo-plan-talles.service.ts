import { AgregadoProductoPedidoDTO } from '../productos-pedido/dto/AgregadoProductoPedido.dto';
import { Injectable } from '@nestjs/common';
import { GestionPedidosService } from '../gestion-pedidos/gestion-pedidos.service';
import { ProductosService } from '../productos/productos.service';
import { PrendasPedidoTallesService } from './prendas-pedido-talles.service';
import { ACCIONES_AUDITORIA, AutorAuditoria } from '../auditorias/dto/insertarAuditoria.dto';
import { CANTIDAD_MINIMA_BENEFICIOS, IDS_CON_BENEFICIOS_TRAMO } from '../productos/ids-prendas';
import { BeneficioPedidoDTO } from '../beneficios-pedido/dto/beneficioPedidoDTO';
import { ProductoCantidadDTO } from '../productos-pedido/dto/ProductoCantidad.dto';
import { presupuestoPedidoClientesPage } from '../gestion-pedidos/dto/PresupuestoPedidoClientePage.dto';

// Cambio de beneficios por bajar de tramo: los que tenía el pedido y los que le quedan
export interface CambioBeneficiosTramo
{
    anteriores: BeneficioPedidoDTO[];
    nuevos: BeneficioPedidoDTO[];
}

// Recalcula productos, precios y cuotas del pedido a partir de los talles cargados.
// Lo usan la confirmación de talles (con firma) y la edición excepcional posterior (sin firma).
@Injectable()
export class RecalculoPlanTallesService
{
    constructor(
        private gestionPedidosService: GestionPedidosService,
        private prendasService: PrendasPedidoTallesService,
        private productosService: ProductosService,
    ) {}

    // Valida y arma el plan nuevo sin guardar nada (si faltan talles de prendas liberadas, corta acá)
    async prepararPlan(idGrupo: number, idPedido: number)
    {
        const presupuesto = await this.gestionPedidosService.obtenerPresupuestoPedidosClientes(idGrupo);
        // Se recalcula con los precios vigentes a la fecha de venta, no con el catálogo actual
        const fechaVenta = await this.productosService.obtenerFechaVentaGrupo(idGrupo);

        const prendas = await this.prendasService.traerResumenPrendasPedido(idPedido);
        // El tramo de precio se elige con el total (las liberadas son gratis pero cuentan en cantidad)
        const productosFinalesTotales = await this.prendasService.traerProductosFinalesPedido(prendas);

        // Si bajaron de tramo, los beneficios cambian antes de restar las liberadas (las liberadas salen de los beneficios nuevos)
        const cambioBeneficios = await this.calcularCambioBeneficios(presupuesto, productosFinalesTotales, fechaVenta);
        const beneficios = cambioBeneficios?.nuevos ?? presupuesto.beneficios;

        const prendasCobrables = this.prendasService.restarLiberadas(prendas, beneficios);
        const productosFinales = await this.prendasService.traerProductosFinalesPedido(prendasCobrables);

        const nroCuotas = presupuesto.nroCuotas;
        // Con seña los agregados van solo en las cuotas; en cuotas iguales (la seña es la cuota 1) se reparten
        // entre la seña y las cuotas, igual que en Ventas/Presupuesto
        const conSenia = presupuesto.pedido.con_senia;
        const pagos = conSenia ? nroCuotas : nroCuotas + 1;
        const agregadosIndividuales = (await this.productosService.obtenerAgregados(fechaVenta)).filter(a => a.individual);

        const productos = await Promise.all(productosFinales.map(async producto =>
        {
            const cantidadTramo = productosFinalesTotales.find(p => p.idProducto === producto.idProducto)?.cantidadPedida ?? producto.cantidadPedida;
            // con_senia distingue planes con la misma cantidad de cuotas (con y sin seña)
            const precios = await this.productosService.obtenerPreciosId(producto.idProducto, nroCuotas, Math.max(cantidadTramo, producto.cantidadPedida), fechaVenta, presupuesto.pedido.con_senia);
            const anterior = presupuesto.productosPedido.find(p => p.id_producto_original === producto.idProducto);
            const descripcion = anterior?.descripcion ?? producto.nombreProducto;

            // Agregados individuales con el precio que se cobró. Los pedidos viejos solo los tienen en la descripción
            // ("... · Agregado: X"): ahí se toma el precio del catálogo. Precio total por prenda, repartido entre las cuotas.
            const [, ...nombresAgregados] = descripcion.split(' · Agregado: ');
            const agregados: AgregadoProductoPedidoDTO[] = anterior?.agregados?.length
                ? anterior.agregados
                : agregadosIndividuales
                    .filter(a => nombresAgregados.includes(a.agregado))
                    .map(a => ({ id_agregado: a.id, agregado: a.agregado, precio: Number(a.precio || 0) }));
            const costoAgregados = agregados.reduce((total, a) => total + Number(a.precio || 0), 0);
            const parteAgregados = pagos ? costoAgregados / pagos : 0;

            return {
                id_pedido: idPedido,
                id_producto_original: producto.idProducto,
                descripcion,
                valor_senia: Number(precios!.valor_senia) + (conSenia ? 0 : parteAgregados),
                valor_cuota: Number(precios!.valor_cuota) + parteAgregados,
                cantidad: producto.cantidadPedida,
                agregados,
            };
        }));

        // Agregados globales (bandera): se cobran una vez, repartidos entre los pagos del plan
        const costoAgregadosGlobales = presupuesto.agregadosGlobales.reduce((total, a) => total + Number(a.precio || 0), 0);
        const parteGlobales = pagos ? costoAgregadosGlobales / pagos : 0;

        // Descuento por hermanos: cada hermano tiene el % sobre lo que paga un egresado (total sin bandera /
        // grupos.cantidad_egresados), en la cuota y en la seña. Mismo criterio que el front (descuentoHermanos en plan-cuotas.ts).
        const porcentaje = Number(presupuesto.pedido.porcentaje_descuento_hermanos) || 0;
        const hermanos = Number(presupuesto.pedido.cantidad_hermanos) || 0;
        const egresados = Number(presupuesto.cantidadEgresados) || 0;
        const descuento = (totalSinBandera: number) => egresados ? (totalSinBandera / egresados) * (porcentaje / 100) * hermanos : 0;

        const seniaProductos = productos.reduce((total, p) => total + p.valor_senia * p.cantidad, 0);
        const cuotaProductos = productos.reduce((total, p) => total + p.valor_cuota * p.cantidad, 0);
        const totalSenia = seniaProductos + (conSenia ? 0 : parteGlobales) - descuento(seniaProductos);
        const totalCuota = cuotaProductos + parteGlobales - descuento(cuotaProductos);

        return {
            id_pedido: idPedido,
            productos,
            // Se conserva el precio que se cobró en la venta (no el del catálogo actual)
            agregadosGlobales: presupuesto.agregadosGlobales.map(a => ({ id_agregado: a.id_agregado, precio: Number(a.precio) })),
            nueva_cantidad_cuotas: nroCuotas,
            valor_cuota_nuevo: totalCuota,
            valor_senia_nuevo: totalSenia,
            // Solo si cambian: modificarPlanPedido los guarda junto con el plan
            ...(cambioBeneficios
                ? { beneficios: cambioBeneficios.nuevos.map(b => ({ id_beneficio: b.id_beneficio, cantidad: b.cantidad })) }
                : {}),
        };
    }

    // Regla de beneficios por tramo (solo campera, buzo, combos y campera universitaria):
    //  - Tramo viejo: el más alto entre esos productos en el pedido antes del recálculo (cantidad cobrada + sin cargo,
    //    igual que en la venta). Tramo nuevo: el más alto entre esos productos con los talles cargados.
    //  - Si el nuevo es igual o mayor (alguno se mantiene, o aumentó), los beneficios no cambian.
    //  - Si es menor, el pedido pierde todos sus beneficios y recibe los del tramo nuevo del producto con más
    //    unidades, según los vigentes a la fecha de venta.
    // Los tramos son los mismos para todos los productos, así que se comparan por cantidad_desde.
    // Menos de CANTIDAD_MINIMA_BENEFICIOS cuenta como un tramo más bajo, sin beneficios (ej. 22 -> 15 pierde los de "20 a 25").
    private async calcularCambioBeneficios(
        presupuesto: presupuestoPedidoClientesPage,
        productosFinalesTotales: ProductoCantidadDTO[],
        fechaVenta: string,
    ): Promise<CambioBeneficiosTramo | null>
    {
        const sinCargo = (idProducto: number) => presupuesto.beneficios
            .filter(b => b.id_producto === idProducto)
            .reduce((total, b) => total + Number(b.cantidad), 0);

        const anteriores = presupuesto.productosPedido.filter(p => IDS_CON_BENEFICIOS_TRAMO.includes(p.id_producto_original));
        if (!anteriores.length) return null;

        // Tramo para comparar: el de la cantidad, o 0 si no llega al mínimo de beneficios
        const nivel = (cantidad: number, tramo: { cantidad_desde: number } | null) =>
            cantidad < CANTIDAD_MINIMA_BENEFICIOS ? 0 : (tramo?.cantidad_desde ?? 0);

        const cantidadesViejas = anteriores.map(p => Number(p.cantidad) + sinCargo(p.id_producto_original));
        const tramosViejos = await Promise.all(anteriores.map((p, i) =>
            this.productosService.obtenerTramoBeneficios(p.id_producto_original, cantidadesViejas[i], fechaVenta)));
        const tramoViejo = Math.max(0, ...tramosViejos.map((t, i) => nivel(cantidadesViejas[i], t)));

        const nuevos = productosFinalesTotales.filter(p => IDS_CON_BENEFICIOS_TRAMO.includes(p.idProducto) && p.cantidadPedida > 0);
        const tramosNuevos = await Promise.all(nuevos.map(p =>
            this.productosService.obtenerTramoBeneficios(p.idProducto, p.cantidadPedida, fechaVenta)));
        const tramoNuevo = Math.max(0, ...tramosNuevos.map((t, i) => nivel(nuevos[i].cantidadPedida, t)));

        if (tramoNuevo >= tramoViejo) return null;

        // Beneficios del tramo nuevo del producto con más unidades (si no quedó ninguno, el pedido queda sin beneficios)
        let principal = -1;
        nuevos.forEach((p, i) => { if (principal < 0 || p.cantidadPedida > nuevos[principal].cantidadPedida) principal = i; });
        // Debajo del mínimo no corresponden los beneficios del primer tramo
        const beneficiosNuevos = principal >= 0 && nuevos[principal].cantidadPedida >= CANTIDAD_MINIMA_BENEFICIOS
            ? (tramosNuevos[principal]?.beneficios ?? [])
            : [];

        return { anteriores: presupuesto.beneficios, nuevos: beneficiosNuevos };
    }

    // autor: el cliente (al confirmar o al guardar talles editados) o el usuario que cerró la edición
    async aplicarPlan(plan: Awaited<ReturnType<RecalculoPlanTallesService['prepararPlan']>>, autor: AutorAuditoria)
    {
        return await this.gestionPedidosService.modificarPlanPedido(plan, autor, ACCIONES_AUDITORIA.PLAN_RECALCULADO_TALLES);
    }

    async recalcular(idGrupo: number, idPedido: number, autor: AutorAuditoria)
    {
        return await this.aplicarPlan(await this.prepararPlan(idGrupo, idPedido), autor);
    }
}
