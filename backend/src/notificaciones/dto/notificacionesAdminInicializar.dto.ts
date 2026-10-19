export class inicializarNotificacionesDTO
{
    id_pedido!: number;
    cuotas!: {id:number, fechaVencimiento: string, nro:number}[];
    banco!: "COMAFI" | "Santander" | "Efectivo";
    localidad!: string;
    provincia!:string;
    envioGratis!: boolean;
    zonaSur!:boolean;
    beneficioBandera!:boolean;
}