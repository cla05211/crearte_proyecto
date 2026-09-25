// Beneficio asignado a un pedido (tabla beneficios_pedido + nombre del catálogo).
export interface BeneficioPedidoDTO
{
    id_beneficio: number;
    cantidad: number;
    beneficio: string;
    id_producto: number | null;
}

// Lo que se manda al guardar (crear venta / editar beneficios).
export interface BeneficioPedidoPostDTO
{
    id_beneficio: number;
    cantidad: number;
}

export function formatearBeneficios(beneficios: { cantidad: number; beneficio: string }[] | null | undefined): string
{
    if (!beneficios?.length) return 'Sin beneficio';
    return beneficios.map((b) => `${b.cantidad} ${b.beneficio}`).join(' - ');
}

type BeneficioConProducto = { id_producto: number | null; cantidad: number };

/** Prendas sin cargo (liberadas por beneficio) de un producto. */
export function cantidadSinCargo(beneficios: BeneficioConProducto[] | null | undefined, idProducto: number): number
{
    return (beneficios ?? [])
        .filter((b) => b.id_producto === idProducto)
        .reduce((total, b) => total + b.cantidad, 0);
}

/**
 * Beneficios de prendas liberadas cuyo producto no tiene fila propia en el pedido
 * (ej: la campera de regalo quedó "adentro" de los combos). Se muestran como fila aparte.
 */
export function liberadasSinFila<T extends BeneficioConProducto>(beneficios: T[] | null | undefined, idsProductos: number[]): T[]
{
    return (beneficios ?? []).filter((b) => b.id_producto != null && !idsProductos.includes(b.id_producto));
}
