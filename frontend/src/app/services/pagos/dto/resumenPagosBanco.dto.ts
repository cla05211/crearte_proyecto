// Contadores de Cuentas Bancarias (una unidad = un comprobante, igual que las líneas de la tabla)
export interface ResumenPagosBanco
{
    total: number;
    pendientesEnvio: number;
    aprobados: number;
    rechazados: number;
}
