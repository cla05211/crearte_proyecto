class TalleResumenDTO
{
    talle!: string;
    cantidad!: number;
    inscripciones!: string[];
}

class ProductoTallesDTO
{
    nombreProducto!: string;
    talles!: TalleResumenDTO[];
    total!: number;
}

class ComponenteComboDTO
{
    nombre!: string;
    cantidad!: number;
}

class ComboDTO
{
    nombreCombo!: string;
    cantidad!: number;
    componentes!: ComponenteComboDTO[];
}

class ProductoSueltoDTO
{
    nombre!: string;
    cantidad!: number;
}

export class GenerarResumenTallesDTO
{
    colegioNombre!: string;
    localidad!: string | null;
    provincia!: string | null;
    turno!: string | null;
    nivel!: string | null;
    orientacion!: string | null;
    padreResponsable!: string | null;
    combos!: ComboDTO[];
    sueltas!: ProductoSueltoDTO[];
    prendas!: ProductoTallesDTO[];
    beneficios!: string[];
    // Firma del cliente al confirmar los talles (PNG en base64). Si no hay, el PDF sale como resumen previo.
    firmaBase64?: string | null;
    fechaFirma?: string | null;
}
