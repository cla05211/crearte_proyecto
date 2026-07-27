export class ProductoConPrecioResponseDTO
{
    id_producto_precio!: number; 
    cantidad_desde!: number;
    cantidad_hasta!: number;
    cuotas!: number;
    valor_senia!: number;
    valor_cuota!: number;
    beneficio!:string | null;
    nombre!: string;
    descripcion!:string;
}