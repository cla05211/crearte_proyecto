export interface PagoResponseDTO
{
    id: number;
    id_pedido: number;
    nro_transferencia: string;
    tipo_pago: string;
    monto: number;
    motivo: string;
    fecha: Date;
}