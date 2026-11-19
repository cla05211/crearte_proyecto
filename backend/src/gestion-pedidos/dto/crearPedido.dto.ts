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
import { AgregadoGlobalPedidoPostDTO } from "../../agregados-globales-pedido/dto/AgregadoGlobalPedidoPost.dto";
import { AgregarBeneficioDto } from "../../beneficios/dto/agregarBeneficio.dto";

export class CrearPedidoDTO
{
    colegioDTO!: ColegioDTO;
    grupoDTO!:GrupoDTO;
    pedidoDTO!: PedidoDTO;
    productosPedidoDTO!: ProductoPedidoDTO[];
    agregadosGlobalesDTO!: AgregadoGlobalPedidoPostDTO[];
    padresResponsablesDTO!:  PadreResponsableDTO[];
    alumnosResponsablesDTO!: alumnoResponsableDTO[];
    pagosDTO!: PagoDTO[];
    movimientoDTO!: MovimientoDTO;
    documentoDTO?: DocumentoDTO | DocumentoDTO[];
    primerCuota!: CuotaInicioVentaDTO;
    nroCuotas!: number;
    beneficiosDTO!: AgregarBeneficioDto[];
}