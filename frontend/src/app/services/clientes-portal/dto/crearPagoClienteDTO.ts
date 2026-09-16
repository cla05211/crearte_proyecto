export interface CrearPagoClienteDTO
{
    monto: number;
    motivo: string;
    fecha: string;
    banco: string;
    entidad_pago:string;
    nroTransferencia: string;
}