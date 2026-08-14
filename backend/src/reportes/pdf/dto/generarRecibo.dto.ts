export class GenerarReciboDTO {
    numero!: string;
    fecha!: string;
    clienteNombre!: string;
    domicilio?: string;
    localidad?: string;
    concepto!: string;
    importe!: number;
    leyendaSenia?: boolean;
}
 