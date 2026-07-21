export class PedidoDTO
{
    id_grupo!: number;
    id_vendedora!: number;
    id_diseñadora!:number;
    talles!: string;
    envio_gratis!:boolean;
    seña!: string;
    observaciones!: string;
    estado_general!: string;
    fecha_aprobacion_boceto!:string;
    fecha_aprobacion_talles!: string;
    colores!: string;
    cantidad_hermanos!: number;
    porcentaje_descuento_hermanos!: number;
    buzo_campera!:string;
    chomba_remera!:string;
    estado_talles!:string;
    estado_boceto!:string;
    recursos_adicionales!:string[];
}