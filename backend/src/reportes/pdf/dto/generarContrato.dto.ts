export class CompradorContratoDTO {
    nombre!: string;
    dni!: string;
    // PNG en base64. Si viene, el bloque de firma sale con la imagen, el nombre y el DNI.
    firma?: string | null;
}

export class ProductoContratoDTO {
    cantidad!: number;
    producto!: string;
}

export class CuotaContratoDTO {
    monto!: number;
    vencimiento?: string;
}

export class GenerarContratoDTO {
    diaFecha!: string;
    mesFecha!: string;
    anioFecha!: string;

    compradores!: CompradorContratoDTO[];

    colegioNombre!: string;
    turno!: string;
    orientacion?: string;

    localidad!: string;
    provincia!: string;

    productos!: ProductoContratoDTO[];
    beneficios?: string[];

    tieneSenia!: boolean;
    montoSenia?: number;

    montoTotal!: number;
    cuotas!: CuotaContratoDTO[];

    mesEntrega!: string;
    anioEntrega!: string;
}
