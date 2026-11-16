// Beneficio de un tramo de cantidad (precios_productos.beneficios)
export interface BeneficioTramoDTO
{
    id_beneficio: number;
    cantidad: number;
}

// Beneficios de un tramo para guardar desde la página de productos (se aplican a todos los planes)
export interface TramoBeneficiosDTO
{
    cantidad_desde: number;
    cantidad_hasta: number;
    beneficios: BeneficioTramoDTO[];
}
