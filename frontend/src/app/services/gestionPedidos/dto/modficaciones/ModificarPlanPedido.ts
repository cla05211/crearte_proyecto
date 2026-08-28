import { ProductoPedidoDTO } from "../../../productosPedidos/dto/ProductoPedido.dto";
import { AgregadoGlobalPedidoPostDTO } from "../AgregadoGlobalPedidoPost.dto";


export class ModificarPlanPedidoDTO
{
    id_pedido!: number;
    productos!: ProductoPedidoDTO[];
    agregadosGlobales!: AgregadoGlobalPedidoPostDTO[];
    nueva_cantidad_cuotas!: number;
    valor_cuota_nuevo!: number;
    valor_senia_nuevo!: number;
}