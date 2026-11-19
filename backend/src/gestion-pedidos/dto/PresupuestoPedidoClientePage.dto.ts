import { PedidoDTO } from "../../pedidos/dto/pedido.dto";
import { PedidoDTOResponse } from "../../pedidos/dto/pedidoResponse.dto";
import { ProductoPedidoResponseDTO } from "../../productos-pedido/dto/ProductoPedidoResponse.dto copy";
import { ProductoPedidoResponseConNombreOriginalDTO } from "../../productos-pedido/dto/ProductoPedidoResponse.dto";
import { AgregadoGlobalPedidoResponseDTO } from "../../agregados-globales-pedido/dto/AgregadoGlobalPedidoResponse.dto";
import { BeneficioPedidoDTO } from "../../beneficios-pedido/dto/beneficioPedidoDTO";

export class presupuestoPedidoClientesPage
{
    pedido!: PedidoDTOResponse;
    productosPedido!: ProductoPedidoResponseConNombreOriginalDTO[];
    agregadosGlobales!: AgregadoGlobalPedidoResponseDTO[];
    nroCuotas!: number;
    cantidadEgresados!: number;
    beneficios!: BeneficioPedidoDTO[];
}