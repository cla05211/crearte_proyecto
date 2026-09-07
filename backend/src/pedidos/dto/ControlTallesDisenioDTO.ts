import { PedidoDTO } from "./pedido.dto";

export class ControlTallesDisenioDTO
{
    id!: number;
    nro_cuotas!: number;
    año!:number;
    nombre_colegio!: string;
    nro_contacto!: string;
    productos!:string;
    estado_boceto!:string
    estado_talles!:string
    fecha_aprobacion_boceto!: Date|null;
    fecha_aprobacion_talles!: Date|null;    
}