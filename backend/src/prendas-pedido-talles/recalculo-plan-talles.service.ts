import { Injectable } from '@nestjs/common';
import { GestionPedidosService } from 'src/gestion-pedidos/gestion-pedidos.service';
import { ProductosService } from 'src/productos/productos.service';
import { PrendasPedidoTallesService } from './prendas-pedido-talles.service';

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

        const productos = await Promise.all(productosFinales.map(async producto =>
        {
            const cantidadTramo = productosFinalesTotales.find(p => p.idProducto === producto.idProducto)?.cantidadPedida ?? producto.cantidadPedida;
            const precios = await this.productosService.obtenerPreciosId(producto.idProducto, nroCuotas, Math.max(cantidadTramo, producto.cantidadPedida));
            const anterior = presupuesto.productosPedido.find(p => p.id_producto_original === producto.idProducto);

            return {
                id_pedido: idPedido,
                id_producto_original: producto.idProducto,
                descripcion: anterior?.descripcion ?? producto.nombreProducto,
                valor_senia: precios!.valor_senia,
                valor_cuota: precios!.valor_cuota,
                cantidad: producto.cantidadPedida,
            };
        }));

        const totalSenia = productos.reduce((total, p) => total + p.valor_senia * p.cantidad, 0);
        const totalCuotaSinDescuento = productos.reduce((total, p) => total + p.valor_cuota * p.cantidad, 0);
        const porcentaje = Number(presupuesto.pedido.porcentaje_descuento_hermanos) || 0;
        const hermanos = Number(presupuesto.pedido.cantidad_hermanos) || 0;
        const totalCuota = totalCuotaSinDescuento - totalCuotaSinDescuento * (porcentaje / 100) * hermanos;

        return {
            id_pedido: idPedido,
            productos,
            agregadosGlobales: presupuesto.agregadosGlobales.map(a => ({ id_agregado: a.id_agregado })),
            nueva_cantidad_cuotas: nroCuotas,
            valor_cuota_nuevo: totalCuota,
            valor_senia_nuevo: totalSenia,
        };
    }

    async aplicarPlan(plan: Awaited<ReturnType<RecalculoPlanTallesService['prepararPlan']>>)
    {
        return await this.gestionPedidosService.modificarPlanPedido(plan);
    }

    async recalcular(idGrupo: number, idPedido: number)
    {
        return await this.aplicarPlan(await this.prepararPlan(idGrupo, idPedido));
    }
}
