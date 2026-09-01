export interface PagoResponseDTO
{
    id: number;
    id_pedido: number;
    nro_transferencia: string;
    monto: number;
    motivo: string;
    fecha: Date;
    aprobado: boolean;
    enviado_banco:boolean;
    entidad_pago: string;
    banco?: string;
    id_documento?: number;
}