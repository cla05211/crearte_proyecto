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
    idComprobante!: number | null;
    calendario!: string;
    fechaEntrega!: string | null;
    formaEntrega!: string;
    contratoFirmado!: boolean;
    envioGratis!: boolean;
    fechaEntregaAproximada!: string | null;
}
