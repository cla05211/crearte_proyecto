export interface CompradorContratoDTO {
    nombre: string;
    dni: string;
}

export interface ProductoContratoDTO {
    cantidad: number;
    producto: string;
}

export interface CuotaContratoDTO {
    monto: number;
    vencimiento?: string;
}

export interface GenerarContratoDTO {
    diaFecha: string;
    mesFecha: string;
    anioFecha: string;

    compradores: CompradorContratoDTO[];

    colegioNombre: string;
    turno: string;
    orientacion?: string;

    localidad: string;
    provincia: string;

    productos: ProductoContratoDTO[];
    beneficios?: string[];

    tieneSenia: boolean;
    montoSenia?: number;

    montoTotal: number;
    cuotas: CuotaContratoDTO[];

    mesEntrega: string;
    anioEntrega: string;
}
