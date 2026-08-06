import { ProductoPedidoDTO } from "src/productos-pedido/dto/ProductoPedido.dto";


export class ModificarPlanPedidoDTO
{
    id_pedido!: number;
    productos!: ProductoPedidoDTO[];
    nueva_cantidad_cuotas!: number;
    valor_cuota_nuevo!: number;
    valor_senia_nuevo!: number;
}