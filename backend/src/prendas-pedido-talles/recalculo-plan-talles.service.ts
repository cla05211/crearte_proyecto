import { AgregadoProductoPedidoDTO } from 'src/productos-pedido/dto/AgregadoProductoPedido.dto';
import { Injectable } from '@nestjs/common';
import { GestionPedidosService } from 'src/gestion-pedidos/gestion-pedidos.service';
import { ProductosService } from 'src/productos/productos.service';
import { PrendasPedidoTallesService } from './prendas-pedido-talles.service';
import { ACCIONES_AUDITORIA, AutorAuditoria } from 'src/auditorias/dto/insertarAuditoria.dto';

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

        const prendas = await this.prendasService.traerResumenPrendasPedido(idPedido);
        const prendasCobrables = this.prendasService.restarLiberadas(prendas, presupuesto.beneficios);
        // Se cobran las cobrables, pero el tramo de precio se elige con el total (las liberadas son gratis pero cuentan en cantidad).
        const productosFinales = await this.prendasService.traerProductosFinalesPedido(prendasCobrables);
        const productosFinalesTotales = await this.prendasService.traerProductosFinalesPedido(prendas);

        const nroCuotas = presupuesto.nroCuotas;
        // Con seña los agregados van solo en las cuotas; en cuotas iguales (la seña es la cuota 1) se reparten
        // entre la seña y las cuotas, igual que en Ventas/Presupuesto
        const conSenia = presupuesto.pedido.con_senia;
        const pagos = conSenia ? nroCuotas : nroCuotas + 1;
        const agregadosIndividuales = (await this.productosService.obtenerAgregados()).filter(a => a.individual);

        const productos = await Promise.all(productosFinales.map(async producto =>
        {
            const cantidadTramo = productosFinalesTotales.find(p => p.idProducto === producto.idProducto)?.cantidadPedida ?? producto.cantidadPedida;
            // con_senia distingue planes con la misma cantidad de cuotas (con y sin seña)
            const precios = await this.productosService.obtenerPreciosId(producto.idProducto, nroCuotas, Math.max(cantidadTramo, producto.cantidadPedida), presupuesto.pedido.con_senia);
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

        const totalSenia = productos.reduce((total, p) => total + p.valor_senia * p.cantidad, 0) + (conSenia ? 0 : parteGlobales);
        const totalCuotaSinDescuento = productos.reduce((total, p) => total + p.valor_cuota * p.cantidad, 0) + parteGlobales;
        const porcentaje = Number(presupuesto.pedido.porcentaje_descuento_hermanos) || 0;
        const hermanos = Number(presupuesto.pedido.cantidad_hermanos) || 0;
        const totalCuota = totalCuotaSinDescuento - totalCuotaSinDescuento * (porcentaje / 100) * hermanos;

        return {
            id_pedido: idPedido,
            productos,
            // Se conserva el precio que se cobró en la venta (no el del catálogo actual)
            agregadosGlobales: presupuesto.agregadosGlobales.map(a => ({ id_agregado: a.id_agregado, precio: Number(a.precio) })),
            nueva_cantidad_cuotas: nroCuotas,
            valor_cuota_nuevo: totalCuota,
            valor_senia_nuevo: totalSenia,
        };
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
