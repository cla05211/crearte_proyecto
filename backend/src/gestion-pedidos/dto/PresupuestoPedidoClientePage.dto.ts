import { PedidoDTO } from "src/pedidos/dto/pedido.dto";
import { PedidoDTOResponse } from "src/pedidos/dto/pedidoResponse.dto";
import { ProductoPedidoResponseDTO } from "src/productos-pedido/dto/ProductoPedidoResponse.dto copy";
import { ProductoPedidoResponseConNombreOriginalDTO } from "src/productos-pedido/dto/ProductoPedidoResponse.dto";
import { AgregadoGlobalPedidoResponseDTO } from "src/agregados-globales-pedido/dto/AgregadoGlobalPedidoResponse.dto";

export class presupuestoPedidoClientesPage
{
    pedido!: PedidoDTOResponse;
    productosPedido!: ProductoPedidoResponseConNombreOriginalDTO[];
    agregadosGlobales!: AgregadoGlobalPedidoResponseDTO[];
    nroCuotas!: number;
    // Cantidad de egresados del grupo — la necesita el front (staff y portal
    // de clientes) para repartir el precio grupal de cada agregado global
    // (ej. la bandera) entre los egresados y mostrar su costo individual.
    cantidadEgresados!: number;
}