export class PagoBancoResponse
{
    id!: number;
    fecha!: Date;
    nro_transferencia!: string;
    entidad_pago!: string;
    banco!: string;
    monto!: number;
    nombre_colegio!: string;
    aprobado!: boolean;
    enviado_banco!: boolean;
    motivo!:string;
}