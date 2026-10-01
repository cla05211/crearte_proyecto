export class inicializarNotificacionesDTO
{
    id_pedido!: number;
    cuotas!: {id:number, fechaVencimiento: Date}[];
    banco!: string;
    localidad!: string;
    provincia!:string;
    envioGratis!: boolean;
    zonaSur!:boolean;
    beneficioBandera!:boolean;
}