export class pedidoListoParaEnviarDto
{
    idPedido!: number;
    nroPedido!: number | null;
    estado!: string;
    pagoRealizado!: string;
    cantBultos!: number | null;
    empresaEnvio!: string | null;
    datosEnvio!: boolean;
    cotizacion!: number | null;
    medioPagoEnvio!: 'Efectivo' | 'Transferencia' | null; // solo envíos gratis con cotización
    idComprobante!: number | null;
    calendario!: string;
    fechaEntrega!: string | null;
    formaEntrega!: string;
    contratoFirmado!: boolean;
    envioGratis!: boolean;
    fechaEntregaAproximada!: string | null;
}
