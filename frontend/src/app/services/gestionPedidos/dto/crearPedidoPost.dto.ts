import { alumnoResponsableDTO } from "./alumnoResponsable.dto";
import { ColegioDTO } from "./Colegio.dto";
import { CuotaInicioVentaDTO } from "./cuotaInicioVenta.dto";
import { DocumentoDTO } from "./documento.dto";
import { GrupoDTO } from "./grupo.dto";
import { MovimientoDTO } from "./movimiento.dto";
import { PadreResponsableDTO } from "./padreResponsable.dto";
import { PagoDTO } from "./pago.dto";
import { PedidoDTO } from "../../pedidos/dto/pedido.dto";
import { ProductoPedidoDTO } from "../../productosPedidos/dto/ProductoPedido.dto";
import { AgregadoGlobalPedidoPostDTO } from "./AgregadoGlobalPedidoPost.dto";

export interface CrearPedidoDTO
{
    colegioDTO: ColegioDTO;
    grupoDTO:GrupoDTO;
    pedidoDTO: PedidoDTO;
    productosPedidoDTO: ProductoPedidoDTO[];
    agregadosGlobalesDTO: AgregadoGlobalPedidoPostDTO[];
    padresResponsablesDTO:  PadreResponsableDTO[];
    alumnosResponsablesDTO: alumnoResponsableDTO[] | null;
    pagosDTO: PagoDTO[];
    movimientoDTO: MovimientoDTO;
    documentoDTO?: DocumentoDTO | DocumentoDTO[];
    primerCuota: CuotaInicioVentaDTO;
    nroCuotas: number;
}