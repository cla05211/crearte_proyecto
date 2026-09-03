export interface CuotaResponseDTO
{
    id: number
    id_pedido: number;
    numero: number;
    fecha_vencimiento: Date;
    importe: number;
    estado: string;
    fecha_pago: Date;
    monto_cubierto: number;
}