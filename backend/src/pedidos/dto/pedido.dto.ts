export class PedidoDTO
{
    id_grupo!: number;
    id_vendedora!: number | null;
    id_disenadora!: number | null;
    talles!: string | null;
    envio_gratis!: boolean | null;
    observaciones!: string | null;
    estado_general!: string | null;
    fecha_aprobacion_boceto!: string | null;
    fecha_aprobacion_talles!: string | null;
    colores!: string | null;
    cantidad_hermanos!: number | null;
    porcentaje_descuento_hermanos!: number | null;
    estado_talles!: string | null;
    estado_boceto!: string | null;
    molderias!: string | null;
}