export interface PagoBancoResponse
{
    id: number;
    fecha: Date;
    nro_transferencia: string;
    entidad_pago: number;
    banco: string;
    monto: number;
    nombre_colegio: string;
    aprobado: boolean;
    enviado_banco: boolean;
}