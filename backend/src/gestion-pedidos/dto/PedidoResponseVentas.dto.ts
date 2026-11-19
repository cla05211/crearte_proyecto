import { alumnoResponsableDTO } from "../../alumno-responsable/dto/alumnoResponsable.dto";
import { ColegioDTO } from "../../colegios/dto/Colegio.dto";
import { DocumentoDTO } from "../../documentos/dto/documento.dto";
import { GrupoDTO } from "../../grupos/dto/grupo.dto";
import { MovimientoDTO } from "../../cuenta-corriente/dto/movimiento.dto";
import { PadreResponsableDTO } from "../../padre-responsable/dto/padreResponsable.dto";
import { PagoDTO } from "../../pagos/dto/pago.dto";
import { PedidoDTO } from "../../pedidos/dto/pedido.dto";
import { ProductoPedidoDTO } from "../../productos-pedido/dto/ProductoPedido.dto";
import { CuotaInicioVentaDTO } from "../../cuotas/dto/cuotaInicioVenta.dto";
import { AgregadoGlobalPedidoResponseDTO } from "../../agregados-globales-pedido/dto/AgregadoGlobalPedidoResponse.dto";
import { BeneficioResponseDTO } from "../../beneficios/dto/beneficioResponse.dto";
import { BeneficioPedidoDTO } from "../../beneficios-pedido/dto/beneficioPedidoDTO";

export class PedidoResponseVentas
{
    colegioDTO!: ColegioDTO;
    grupoDTO!:GrupoDTO;
    pedidoDTO!: PedidoDTO;
    productosPedidoDTO!: ProductoPedidoDTO[];
    agregadosGlobalesDTO!: AgregadoGlobalPedidoResponseDTO[];
    nroCuotas!: number;
    beneficios!: BeneficioPedidoDTO[];
    padresResponsables!: {nombre:string, apellido: string}[];
    fechaVenta!: string;
}