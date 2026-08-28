import { PedidoDTOResponse } from "../../pedidos/dto/pedidoResponse.dto";
import { ProductoPedidoResponseConNombreOriginalDTO } from "../../productosPedidos/dto/ProductoPedidoResponseConNombreOriginal.dto";

export class presupuestoPedidoClientesPage
{
    pedido!: PedidoDTOResponse;
    productosPedido!: ProductoPedidoResponseConNombreOriginalDTO[];
    nroCuotas!: number;
}