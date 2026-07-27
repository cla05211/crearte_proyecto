export interface ProductoConPrecioResponseDTO
{
    id_producto_precio: number; 
    cantidad_desde: number;
    cantidad_hasta: number;
    cuotas: number;
    seña: number;
    valor_cuota: number;
    beneficio:string | null;
    nombre: string;
    descripcion:string;
}