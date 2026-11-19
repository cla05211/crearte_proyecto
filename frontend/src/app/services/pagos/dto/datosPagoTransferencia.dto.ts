// Datos de una transferencia (el comprobante viaja aparte: se sube directo a Supabase)
export interface DatosPagoTransferencia
{
    monto: number;
    fecha: string;
    banco: string;
    entidad_pago: string;
    nroTransferencia: string;
}
