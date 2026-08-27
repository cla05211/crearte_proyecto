export class PagoResponseDTO
{
    id_pedido!: number | null
    nro_transferencia!: string | null;
    tipo_pago!: string | null;
    monto!: number | null;
    motivo!: string | null;
    fecha!: string | null;
    entidad_pago!: string | null;
}