// Quién hizo el cambio: un usuario interno o el cliente desde el portal (talles editados)
export type AutorAuditoria = { idUsuario: number; idCliente?: never } | { idCliente: number; idUsuario?: never };

// Qué se audita. El valor es la tabla que se modifica y es lo que se guarda en auditoria.tabla
export const TABLAS_AUDITORIA = {
    presupuesto: 'productos_pedidos',
    beneficios: 'beneficios_pedido',
    disenio: 'documentos',
    talles: 'prendas_pedido',
    cancelacion: 'pedidos',
} as const;

export type TipoAuditoria = keyof typeof TABLAS_AUDITORIA;
// Tipos que se muestran en la página de auditoría.
// La cancelación se registra igual, pero se muestra en la ficha del cliente (Datos), no ahí.
export const TIPOS_PAGINA_AUDITORIA: TipoAuditoria[] = ['presupuesto', 'beneficios', 'disenio', 'talles'];

export const ACCIONES_AUDITORIA = {
    PLAN_MODIFICADO: 'Plan modificado',
    PLAN_RECALCULADO_TALLES: 'Plan recalculado por talles',
    BENEFICIOS_MODIFICADOS: 'Beneficios modificados',
    BOCETO_SUBIDO: 'Boceto subido',
    BOCETO_REEMPLAZADO: 'Boceto reemplazado',
    FIRMADO_SUBIDO: 'Firmado subido',
    FIRMADO_REEMPLAZADO: 'Firmado reemplazado',
    TALLES_CONFIRMADOS: 'Talles confirmados',
    EDICION_TALLES_HABILITADA: 'Edición de talles habilitada',
    TALLES_EDITADOS: 'Talles editados por el cliente',
    EDICION_TALLES_CERRADA: 'Edición de talles cerrada',
    PEDIDO_CANCELADO: 'Pedido cancelado',
} as const;

export class insertarAuditoriaDTO
{
    tipo!: TipoAuditoria;
    accion!: string;
    idPedido!: number;
    autor!: AutorAuditoria;
    // Id de la fila modificada cuando no es el pedido en sí (ej: el documento del diseño)
    registroId?: number | null;
    datoAnterior?: unknown;
    datoNuevo?: unknown;
    // true = si antes y después son iguales no se registra nada (ej: se guardó el plan sin cambios)
    omitirSiNoCambia?: boolean;
}
