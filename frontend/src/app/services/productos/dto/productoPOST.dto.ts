export interface ProductoPostDTO
{
    cantidad_desde: number;
    cantidad_hasta: number;
    cuotas: number;
    valor_senia: number;
    valor_cuota: number;
    beneficio:string | null;
    id_producto: number;
    nombre: string;
    descripcion:string;
}