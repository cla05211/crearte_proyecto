// Todos los comprobantes de pago de un pedido (cargados por empleados o desde el portal) quedan en:
// imagenes/comprobantes-clientes/comprobante-<idPedido>-<timestamp>-<nombre>
export const CARPETA_COMPROBANTES_PAGO = 'comprobantes-clientes';

export function prefijoComprobantePago(idPedido: number): string
{
    return `${CARPETA_COMPROBANTES_PAGO}/comprobante-${idPedido}-`;
}
