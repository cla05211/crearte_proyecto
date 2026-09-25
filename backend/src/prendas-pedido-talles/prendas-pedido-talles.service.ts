import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PrendaPedidoDTO } from './dto/PrendasPedido.dto';
import { ProductoPrendasResumenDTO, TalleCantidadResumenDTO } from './dto/ResumenPrendasPedido.dto';
import { ProductoCantidadDTO } from 'src/productos-pedido/dto/ProductoCantidad.dto';
import { BeneficioPedidoDTO } from 'src/beneficios-pedido/dto/beneficioPedidoDTO';

const ID_BANDERA = 73;

@Injectable()
export class PrendasPedidoTallesService 
{
    constructor(private sb: SupabaseService){}
       
    async traerPrendasPedido(idPedido:number)
    {
        const { data, error } = await this.sb.supabase
        .from('prendas_pedido')
        .select('*')
        .eq('id_pedido', idPedido);

        if (error) 
        {
            throw new InternalServerErrorException(`No se pudieron traer las prendas. ${error.message}`);
        }

        const prendas: PrendaPedidoDTO[] = data.map(p => ({
            id_pedido: p.id_pedido,
            id_producto: p.id_producto!,
            talle: p.talle!,
            inscripcion: p.inscripcion
        }));

        return prendas;   
    }

    async guardarPrendasPedido(idPedido: number, prendasPedido: PrendaPedidoDTO[])
    {
        await this.eliminarPrendasPedidoTalles(idPedido);

        const prendasPedidoConId = prendasPedido.map(prenda => ({ ...prenda, id_pedido: idPedido }));

        const { data, error } = await this.sb.supabase
        .from('prendas_pedido')
        .insert(prendasPedidoConId)

        if (error) 
        {
            throw new InternalServerErrorException(`No se pudieron agregar las prendas. ${error.message}`);
        }

        return data;      
    }

    async eliminarPrendasPedidoTalles(idPedido:number)
    {
        const { data, error } = await this.sb.supabase
        .from('prendas_pedido')
        .delete()
        .eq('id_pedido', idPedido)

        if (error) 
        {
            throw new InternalServerErrorException(`No se pudieron eliminar las prendas del pedido. ${error.message}`);
        }

        return data;      
    }

    async traerResumenPrendasPedido(idPedido: number): Promise<ProductoPrendasResumenDTO[]>
    {
        const { data, error } = await this.sb.supabase
            .from('prendas_pedido')
            .select('talle, inscripcion, productos(id, nombre)')
            .eq('id_pedido', idPedido);

        if (error)
        {
            throw new InternalServerErrorException(`No se pudieron traer las prendas. ${error.message}`);
        }

        const productosMap = new Map<number, { nombreProducto: string; talles: Map<string, { cantidad: number; inscripciones: string[] }> }>();

        for (const fila of data)
        {
            if (!fila.productos || fila.productos.id === ID_BANDERA || !fila.talle) continue;

            if (!productosMap.has(fila.productos.id))
            {
                productosMap.set(fila.productos.id, { nombreProducto: fila.productos.nombre, talles: new Map() });
            }
            const producto = productosMap.get(fila.productos.id)!;

            if (!producto.talles.has(fila.talle))
            {
                producto.talles.set(fila.talle, { cantidad: 0, inscripciones: [] });
            }
            const infoTalle = producto.talles.get(fila.talle)!;
            infoTalle.cantidad++;
            if (fila.inscripcion) { infoTalle.inscripciones.push(fila.inscripcion); }
        }

        const resumen: ProductoPrendasResumenDTO[] = [];

        for (const [idProducto, producto] of productosMap.entries())
        {
            const talles: TalleCantidadResumenDTO[] = [...producto.talles.entries()].map(([talle, info]) => ({
                talle,
                cantidad: info.cantidad,
                inscripciones: info.inscripciones,
            }));
            const total = talles.reduce((suma, t) => suma + t.cantidad, 0);

            resumen.push({ idProducto, nombreProducto: producto.nombreProducto, talles, total });
        }

        return resumen;
    }

    async traerProductosFinalesPedido(prendas: ProductoPrendasResumenDTO[]): Promise<ProductoCantidadDTO[]>
    {
        let prendasFinales : ProductoCantidadDTO[] = [];
        
        const { data, error } = await this.sb.supabase
        .from('producto_componentes')
        .select('id_producto_combo, id_producto_componente')

        if (error)
        {
            throw new InternalServerErrorException(`No se pudieron traer los componentes. ${error.message}`);
        }

        //filtramos
        const prendasNoComponentes = prendas.filter(
            (prenda) =>!data?.some((componente) =>componente.id_producto_componente === prenda.idProducto));
        let prendasComponentes = prendas.filter(
            (prenda) =>data?.some((componente) =>componente.id_producto_componente === prenda.idProducto));


        const idsProductoOriginalComponentes = prendasComponentes.map(p => p.idProducto);

        //Sacamos que combo es 
        const { data: dataCombos, error: errorCombos } = await this.sb.supabase
        .from('producto_componentes')
        .select('id_producto_combo, id_producto_componente, productos!producto_componentes_combo_fkey(nombre)')
        .in('id_producto_componente',idsProductoOriginalComponentes)

        if (errorCombos)
        {
            throw new InternalServerErrorException(`No se pudieron traer los combos. ${errorCombos.message}`);
        }

        //id
        const comboPedido = dataCombos?.find((item, index, array) =>
        array.filter(x => x.id_producto_combo === item.id_producto_combo).length === 2);

        if (!comboPedido)
        {
            return prendas.map(prenda => ({idProducto: prenda.idProducto, nombreProducto: prenda.nombreProducto, cantidadPedida: prenda.total}));
        }

        const componentesDeOtrosCombos = prendasComponentes.filter(
            (prenda) => !dataCombos.some(x => x.id_producto_combo === comboPedido.id_producto_combo && x.id_producto_componente === prenda.idProducto));
        prendasNoComponentes.push(...componentesDeOtrosCombos);
        prendasComponentes = prendasComponentes.filter(prenda => !componentesDeOtrosCombos.includes(prenda));

        //Sacamos la cantidad de combos
        let cantidadCombos = 0;
        let cantidadPrendasSueltas = prendasComponentes[0].total - prendasComponentes[1].total;
        if (cantidadPrendasSueltas < 0)
        {
            cantidadPrendasSueltas = -cantidadPrendasSueltas;
            cantidadCombos = prendasComponentes[1].total - cantidadPrendasSueltas;
            //Si 1 era el mayor entonces quedan prendas sueltas de ese, las mandamos al pedido final
            prendasFinales.push({ idProducto: prendasComponentes[1].idProducto, nombreProducto: prendasComponentes[1].nombreProducto, cantidadPedida: cantidadPrendasSueltas})
        }
        else
        {
            cantidadCombos = prendasComponentes[0].total - cantidadPrendasSueltas;
            //Si 0 era el mayor entonces quedan prendas sueltas de ese, las mandamos al pedido final
            if (cantidadPrendasSueltas > 0)
                prendasFinales.push({ idProducto: prendasComponentes[0].idProducto, nombreProducto: prendasComponentes[0].nombreProducto, cantidadPedida: cantidadPrendasSueltas})
        }

        //ahora guardamos lo que faltaba
        prendasFinales.push({ idProducto: comboPedido.id_producto_combo, nombreProducto: comboPedido.productos.nombre, cantidadPedida: cantidadCombos})
        prendasFinales.push(...prendasNoComponentes.map(prenda => ({idProducto: prenda.idProducto, nombreProducto: prenda.nombreProducto, cantidadPedida: prenda.total})))
        
        return prendasFinales;
    }

    /**
     * Descuenta de cada producto las prendas liberadas por beneficios (id_producto != null),
     * para que no se cobren ni se cuenten en combos/sueltas. No modifica el array original.
     * estricto = true (confirmar talles): error si faltan talles del producto liberado.
     * estricto = false (resumen previo): descuenta lo que haya, sin cortar.
     */
    restarLiberadas(prendas: ProductoPrendasResumenDTO[], beneficios: BeneficioPedidoDTO[], estricto = true): ProductoPrendasResumenDTO[]
    {
        const liberadas = new Map<number, number>();
        for (const beneficio of beneficios)
        {
            if (beneficio.id_producto != null)
            {
                liberadas.set(beneficio.id_producto, (liberadas.get(beneficio.id_producto) ?? 0) + beneficio.cantidad);
            }
        }

        if (estricto)
        {
            for (const [idProducto, cantidad] of liberadas)
            {
                const prenda = prendas.find(p => p.idProducto === idProducto);
                // Las liberadas siempre son de más: tiene que quedar al menos 1 prenda paga.
                if (!prenda || prenda.total - cantidad < 1)
                {
                    const nombre = prenda?.nombreProducto ?? beneficios.find(b => b.id_producto === idProducto)?.beneficio ?? 'un producto';
                    throw new BadRequestException(
                        `El pedido tiene ${cantidad} prenda(s) liberada(s) de ${nombre} pero solo hay ${prenda?.total ?? 0} cargada(s) en los talles.`);
                }
            }
        }

        return prendas
            .map(prenda => ({ ...prenda, total: Math.max(prenda.total - (liberadas.get(prenda.idProducto) ?? 0), 0) }))
            .filter(prenda => prenda.total > 0);
    }
}
