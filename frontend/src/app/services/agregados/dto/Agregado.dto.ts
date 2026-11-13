export interface AgregadoDTO
{
    id: number;
    agregado: string;
    precio: number;
    individual: boolean;   // true: se cobra por prenda / false: global, una vez por pedido (ej. bandera)
}
