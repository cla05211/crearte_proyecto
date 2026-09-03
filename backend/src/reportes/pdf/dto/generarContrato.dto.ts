export class CompradorContratoDTO {
    nombre!: string;
    dni!: string;
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
