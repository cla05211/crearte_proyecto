import { ProductoPedidoDTO } from "src/productos-pedido/dto/ProductoPedido.dto";
import { AgregadoGlobalPedidoPostDTO } from "src/agregados-globales-pedido/dto/AgregadoGlobalPedidoPost.dto";


export class ModificarPlanPedidoDTO
{
    id_pedido!: number;
    productos!: ProductoPedidoDTO[];
    agregadosGlobales!: AgregadoGlobalPedidoPostDTO[];
    nueva_cantidad_cuotas!: number;
    valor_cuota_nuevo!: number;
    valor_senia_nuevo!: number;
    // Tipo del plan elegido. Si no viene (recálculo por talles) se conserva el del pedido.
    con_senia?: boolean;
    // Beneficios nuevos del pedido (recálculo por talles cuando bajan de tramo). Si no viene, no se tocan.
    beneficios?: { id_beneficio: number; cantidad: number }[];
}