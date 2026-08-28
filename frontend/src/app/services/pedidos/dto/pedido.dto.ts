export class PedidoDTO
{
    id_grupo!: number;
    id_vendedora!: number;
    id_disenadora!:number;
    talles!: string;
    envio_gratis!:boolean;
    observaciones!: string;
    estado_general!: string;
    fecha_aprobacion_boceto!:string|null;
    fecha_aprobacion_talles!: string|null;
    colores!: string;
    cantidad_hermanos!: number;
    porcentaje_descuento_hermanos!: number;
    estado_talles!:string;
    estado_boceto!:string;
    molderias!: string;
}