// Beneficio de un tramo de cantidad (precios_productos.beneficios)
export class BeneficioTramoDTO
{
    id_beneficio!: number;
    cantidad!: number;
}

// Beneficios de un tramo para guardar desde la página de productos
export class TramoBeneficiosDTO
{
    cantidad_desde!: number;
    cantidad_hasta!: number;
    beneficios!: BeneficioTramoDTO[];
}

// Tramo de una cantidad, con sus beneficios (con nombre e id_producto, como los de beneficios_pedido)
export class TramoConBeneficiosDTO
{
    cantidad_desde!: number;
    cantidad_hasta!: number;
    beneficios!: { id_beneficio: number; cantidad: number; beneficio: string; id_producto: number | null }[];
}
