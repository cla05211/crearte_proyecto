export interface EstadisticasCobranzasDTO
{
    fechaVenta: string;
    cancelado: boolean;
    facturacion: number;
    deudaPorMes: number[];
    deudaAnterior: number;
}
