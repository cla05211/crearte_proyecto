import { PedidoDTOResponse } from "../../pedidos/dto/pedidoResponse.dto";
import { ProductoPedidoResponseDTO } from "../../productosPedidos/dto/ProductoPedidoResponse.dto copy";

export class presupuestoPedidoClientesPage
{
    pedido!: PedidoDTOResponse;
    productosPedido!: ProductoPedidoResponseDTO[];
    nroCuotas!: number;
}