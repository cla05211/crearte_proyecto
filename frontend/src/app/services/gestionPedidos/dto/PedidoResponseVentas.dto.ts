import { ColegioDTO } from "./Colegio.dto";
import { GrupoDTO } from "./grupo.dto";
import { PedidoDTO } from "../../pedidos/dto/pedido.dto";
import { ProductoPedidoDTO } from "../../productosPedidos/dto/ProductoPedido.dto";
import { AgregadoGlobalPedidoResponseDTO } from "./AgregadoGlobalPedidoResponse.dto";

export interface PedidoResponseVentas
{
    colegioDTO: ColegioDTO;
    grupoDTO: GrupoDTO;
    pedidoDTO: PedidoDTO;
    productosPedidoDTO: ProductoPedidoDTO[];
    agregadosGlobalesDTO: AgregadoGlobalPedidoResponseDTO[];
    nroCuotas: number;
}