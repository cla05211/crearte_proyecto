export class mensajeInicialAdminDTO
{
    fechaPagoSenia!: string;
    cuotas!: {nro:number, fechaPago:string}[]; 
    nroUltimaCuota!: number;
    banco!: "Comafi" | "Santander";
}
