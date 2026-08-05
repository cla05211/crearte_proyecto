export class PagoResponseDTO
{
    id_pedido!: number
    nro_transferencia!: string;
    tipo_pago!: string;
    monto!: number;
    motivo!: string;
    fecha!: Date;
}