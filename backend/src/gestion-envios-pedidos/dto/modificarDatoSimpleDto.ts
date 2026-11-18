// Columnas de pedidos_envio que se editan directo desde las tablas (sin lógica extra).
// cotizacion, id_comprobante y entregado tienen su propio endpoint.
export const COLUMNAS_DATO_SIMPLE = ['estado', 'pago_realizado', 'cant_bultos', 'empresa_envio', 'datos_envio',
    'calendario', 'fecha_entrega', 'forma_entrega'] as const;

export type ColumnaDatoSimple = typeof COLUMNAS_DATO_SIMPLE[number];

export class modificarDatoSimpleDto
{
    columna!: ColumnaDatoSimple;
    dato!: string | number | boolean | null;
}
