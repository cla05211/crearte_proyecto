// Tienen que coincidir con los check de la tabla pedidos_envio
export const ESTADOS_ENVIO = ['Pendiente de hablar', 'Hable', 'Paga interés', 'Cliente demorado'] as const;
export const PAGOS_ENVIO = ['Sí', 'No'] as const;
export const PAGOS_RETIRO = ['Sí', 'No', 'Efectivo'] as const;
export const EMPRESAS_ENVIO = ['Via cargo', 'Andreani'] as const;
export const CALENDARIOS_RETIRO = ['Agendado', 'Pendiente', 'Comisionista'] as const;
export const FORMAS_ENTREGA = ['Envio', 'Retiro oficina', 'Comisionista'] as const;
// Cómo se pagó un envío gratis: efectivo suma en los egresos de caja, transferencia se ve pero no suma
export const MEDIOS_PAGO_ENVIO = ['Efectivo', 'Transferencia'] as const;

export type EstadoEnvio = (typeof ESTADOS_ENVIO)[number];
export type PagoRealizado = (typeof PAGOS_RETIRO)[number];
export type EmpresaEnvio = (typeof EMPRESAS_ENVIO)[number];
export type CalendarioRetiro = (typeof CALENDARIOS_RETIRO)[number];
export type FormaEntrega = (typeof FORMAS_ENTREGA)[number];
export type MedioPagoEnvio = (typeof MEDIOS_PAGO_ENVIO)[number];

// Pedidos de las tablas "Envío por correo" (formaEntrega = 'Envio') y "Retiro por oficina" (el resto)
export interface PedidoEnvioDTO
{
    idPedido: number;
    nroPedido: number | null;
    estado: EstadoEnvio;
    pagoRealizado: PagoRealizado;
    cantBultos: number | null;
    empresaEnvio: EmpresaEnvio | null;
    datosEnvio: boolean;
    cotizacion: number | null;
    medioPagoEnvio: MedioPagoEnvio | null; // solo envíos gratis con cotización
    idComprobante: number | null;
    calendario: CalendarioRetiro;
    fechaEntrega: string | null;
    formaEntrega: FormaEntrega;
    contratoFirmado: boolean;
    envioGratis: boolean;
    fechaEntregaAproximada: string | null;
}

export interface PedidoEntregadoDTO
{
    idPedido: number;
    nroPedido: number | null;
    fechaEntrega: string | null;
    formaEntrega: FormaEntrega;
}

// Columnas que se editan con PATCH /:idPedido/dato (mismas que COLUMNAS_DATO_SIMPLE del back)
export interface DatosSimplesEnvio
{
    estado: EstadoEnvio;
    pago_realizado: PagoRealizado;
    cant_bultos: number | null;
    empresa_envio: EmpresaEnvio | null;
    datos_envio: boolean;
    calendario: CalendarioRetiro;
    fecha_entrega: string | null;
    forma_entrega: FormaEntrega;
}

export type ColumnaDatoSimple = keyof DatosSimplesEnvio;
