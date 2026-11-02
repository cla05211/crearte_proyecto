export class EstadisticasCobranzasDTO
{
    fechaVenta!: string;
    cancelado!: boolean;
    // Total vendido si se vendió este año (seña + cuotas). Si se canceló, lo que quedó sin devolver. 0 si se vendió otro año.
    facturacion!: number;
    // Lo que falta cobrar de lo que vence en cada mes de este año (12 posiciones, enero a diciembre)
    deudaPorMes!: number[];
    // Lo que falta cobrar de lo que venció en años anteriores
    deudaAnterior!: number;
}
