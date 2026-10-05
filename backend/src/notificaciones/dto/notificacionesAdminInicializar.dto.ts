export class inicializarNotificacionesDTO
{
    id_pedido!: number;
    cuotas!: {id:number, fechaVencimiento: string, nro:number}[];
    banco!: "Comafi" | "Santander";
    localidad!: string;
    provincia!:string;
    envioGratis!: boolean;
    zonaSur!:boolean;
    beneficioBandera!:boolean;
}