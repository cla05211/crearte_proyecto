export class PagoBancoResponse
{
    id!: number;
    fecha!: string | null;
    nro_transferencia!: string | null;
    entidad_pago!: string | null;
    banco!: string | null;
    monto!: number | null;
    nombre_colegio!: string;
    aprobado!: boolean | null;
    enviado_banco!: boolean | null;
    motivo!: string | null;
    localidad!: string;
    turno!: string | null;
    orientacion!: string | null;
    nivel!: string | null;
    id_grupo!: number;
    id_pedido!: number;
}