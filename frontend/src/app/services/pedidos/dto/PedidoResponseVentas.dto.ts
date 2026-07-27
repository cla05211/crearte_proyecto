import { ColegioDTO } from "./Colegio.dto";
import { GrupoDTO } from "./grupo.dto";
import { PedidoDTO } from "./pedido.dto";
import { ProductoPedidoDTO } from "./ProductoPedido.dto";

export interface PedidoResponseVentas
{
    colegioDTO: ColegioDTO;
    grupoDTO: GrupoDTO;
    pedidoDTO: PedidoDTO;
    productosPedidoDTO: ProductoPedidoDTO[];
    nroCuotas: number;
}