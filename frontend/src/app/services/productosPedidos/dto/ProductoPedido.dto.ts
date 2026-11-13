import { AgregadoProductoPedidoDTO } from './AgregadoProductoPedido.dto';

export class ProductoPedidoDTO
{
    id_pedido!: number;
    id_producto_original!: number;
    descripcion!: string;
    valor_senia!: number;
    valor_cuota!: number;
    cantidad!: number; 
    // Agregados individuales con el precio cobrado (pedidos viejos pueden no tenerlos: se leen de la descripción)
    agregados?: AgregadoProductoPedidoDTO[];
}