import { alumnoResponsableDTO } from "src/alumno-responsable/dto/alumnoResponsable.dto";
import { ColegioDTO } from "src/colegios/dto/Colegio.dto";
import { DocumentoDTO } from "src/documentos/dto/documento.dto";
import { GrupoDTO } from "src/grupos/dto/grupo.dto";
import { MovimientoDTO } from "src/cuenta-corriente/dto/movimiento.dto";
import { PadreResponsableDTO } from "src/padre-responsable/dto/padreResponsable.dto";
import { PagoDTO } from "src/pagos/dto/pago.dto";
import { PedidoDTO } from "src/pedidos/dto/pedido.dto";
import { ProductoPedidoDTO } from "src/productos-pedido/dto/ProductoPedido.dto";

export class CrearPedidoDTO
{
    colegioDTO!: ColegioDTO;
    grupoDTO!:GrupoDTO;
    pedidoDTO!: PedidoDTO;
    productosPedidoDTO!: ProductoPedidoDTO[];
    padresResponsablesDTO!:  PadreResponsableDTO[];
    alumnosResponsablesDTO!: alumnoResponsableDTO[];
    pagoDTO!: PagoDTO;
    movimientoDTO!: MovimientoDTO;
    documentoDTO!: DocumentoDTO | DocumentoDTO[];
}