export interface PagoDTO
{
    id_pedido: number
    nro_transferencia: string;
    monto: number;
    motivo: string;
    fecha: Date;
    aprobado: boolean;
    banco: string;
    entidad_pago: string;
}