export class GenerarReciboDTO {
    numero!: string;
    fecha!: string;
    clienteNombre!: string;
    domicilio?: string;
    localidad?: string;
    concepto!: string;
    importe!: number;
    leyendaSenia?: boolean;
    turno!: string;
    orientacion!: string;
    nivel!:string;
    nombrePadre!:string;
    apellidoPadre!:string;
    nroCuotas!:number;
}