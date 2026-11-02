export interface EstadisticasVentasDTO
{
    fechaVenta: string;
    colegio: string;
    vendedora:string;
    nivel: string;
    provincia:string;
    localidad:string;
    nroEgresados: number;
    motivoCancelacion: string|null
    promo:number|null;
    cancelado:boolean;
}