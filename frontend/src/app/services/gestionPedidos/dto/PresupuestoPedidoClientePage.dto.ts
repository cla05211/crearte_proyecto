import { PedidoDTOResponse } from "../../pedidos/dto/pedidoResponse.dto";
import { ProductoPedidoResponseConNombreOriginalDTO } from "../../productosPedidos/dto/ProductoPedidoResponse.dto";
import { AgregadoGlobalPedidoResponseDTO } from "./AgregadoGlobalPedidoResponse.dto";
import { BeneficioPedidoDTO } from "./BeneficioPedido.dto";

export class presupuestoPedidoClientesPage
{
    pedido!: PedidoDTOResponse;
    productosPedido!: ProductoPedidoResponseConNombreOriginalDTO[];
    agregadosGlobales!: AgregadoGlobalPedidoResponseDTO[];
    nroCuotas!: number;
    cantidadEgresados!: number;
    beneficios!: BeneficioPedidoDTO[];
}