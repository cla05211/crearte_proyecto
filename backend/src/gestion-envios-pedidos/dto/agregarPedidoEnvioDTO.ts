export class agregarPedidoEnvioDTO
{
    id_pedido!:number;
    estado!: "Pendiente de hablar" | "Hable" | "Paga interés" | "Cliente demorado";
    pago_realizado!: 'Sí' | 'No' | 'Efectivo'
    cant_bultos!: number;
    empresa_envio!: "Via cargo" | "Andreani";
    datos_envio!: boolean;
    cotizacion!: number;
    id_comprobante!: number; 
    entregado!: boolean;
    calendario!: "Agendado" | "Pendiente" | "Comisionista";
    fecha_entrega!: string;
    forma_entrega!: "" | "Retiro oficina" | "Comisionista";
}

