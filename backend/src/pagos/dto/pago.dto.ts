import { DocumentoDTO } from "src/documentos/dto/documento.dto";

export class PagoDTO
{
    id_pedido!: number
    nro_transferencia!: string;
    monto!: number;
    motivo!: string;
    fecha!: string;
    aprobado!: boolean;
    banco!: string;
    entidad_pago!:string;
    documentoDTO?: DocumentoDTO;
}
