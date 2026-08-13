import { alumnoResponsableDTO } from "./alumnoResponsable.dto";
import { ColegioDTO } from "./Colegio.dto";
import { CuotaInicioVentaDTO } from "./cuotaInicioVenta.dto";
import { DocumentoDTO } from "./documento.dto";
import { GrupoDTO } from "./grupo.dto";
import { MovimientoDTO } from "./movimiento.dto";
import { PadreResponsableDTO } from "./padreResponsable.dto";
import { PagoDTO } from "./pago.dto";
import { PedidoDTO } from "./pedido.dto";
import { ProductoPedidoDTO } from "./ProductoPedido.dto";

export interface CrearPedidoDTO
{
    colegioDTO: ColegioDTO;
    grupoDTO:GrupoDTO;
    pedidoDTO: PedidoDTO;
    productosPedidoDTO: ProductoPedidoDTO[];
    padresResponsablesDTO:  PadreResponsableDTO[];
    alumnosResponsablesDTO: alumnoResponsableDTO[] | null;
    pagoDTO: PagoDTO[];
    movimientoDTO: MovimientoDTO;
    documentoDTO: DocumentoDTO | DocumentoDTO[];
    primerCuota: CuotaInicioVentaDTO;
    nroCuotas: number;
}