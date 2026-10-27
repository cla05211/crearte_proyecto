// Contadores de Cuentas Bancarias (una unidad = un comprobante, igual que las líneas de la tabla)
export class ResumenPagosBancoDTO
{
    total!: number;
    pendientesEnvio!: number;
    aprobados!: number;
    rechazados!: number;
}
