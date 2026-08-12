export class PagoDTO
{
    id_pedido!: number
    nro_transferencia!: string;
    tipo_pago!: string;
    monto!: number;
    motivo!: string;
    fecha!: Date;
    aprobado!: boolean;
    banco!: string;
    entidad_pago!:string;
}