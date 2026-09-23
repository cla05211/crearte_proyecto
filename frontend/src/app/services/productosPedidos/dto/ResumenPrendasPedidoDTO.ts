export class TalleCantidadResumenDTO
{
    talle!: string;
    cantidad!: number;
    inscripciones!: string[];
}

export class ProductoPrendasResumenDTO
{
    idProducto!: number;
    nombreProducto!: string;
    talles!: TalleCantidadResumenDTO[];
    total!: number;
}
