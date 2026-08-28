import { PedidoDTO } from "src/pedidos/dto/pedido.dto";
import { PedidoDTOResponse } from "src/pedidos/dto/pedidoResponse.dto";
import { ProductoPedidoResponseDTO } from "src/productos-pedido/dto/ProductoPedidoResponse.dto copy";

export class presupuestoPedidoClientesPage
{
    pedido!: PedidoDTOResponse;
    productosPedido!: ProductoPedidoResponseDTO[];
    nroCuotas!: number;
}