export interface EstadoSenia
{
    total: number;     
    pagado: number;     
    restante: number;   
    completa: boolean;
    fechaUltimoPago: string | null;  
}

// Seña acordada del pedido: pedidos.senia_total queda fija desde la primera modificación del plan.
// Mientras sea null (nunca se modificó) vale la suma de valor_senia * cantidad de los productos.
export function calcularSeniaTotal(seniaGuardada: number | null | undefined, productos: { valor_senia: number; cantidad: number }[]): number
{
    if (seniaGuardada !== null && seniaGuardada !== undefined) return Number(seniaGuardada);
    return productos.reduce((suma, p) => suma + Number(p.valor_senia || 0) * Number(p.cantidad || 0), 0);
}

export function calcularEstadoSenia(productos: { valor_senia: number; cantidad: number }[],
pagos: { monto: number | null; motivo: string | null; fecha: string | null }[], seniaGuardada?: number | null): EstadoSenia
{
    const total = calcularSeniaTotal(seniaGuardada, productos);

    const pagosSenia = pagos.filter(p => p.motivo === 'Seña');
    const pagado = pagosSenia.reduce((suma, p) => suma + (p.monto ?? 0), 0);

    const fechas = pagosSenia.map(p => p.fecha).filter((f): f is string => !!f).sort();
    const restante = Math.max(0, Math.round((total - pagado) * 100) / 100);

    return {
        total,
        pagado,
        restante,
        completa: restante === 0,
        fechaUltimoPago: fechas.length ? fechas[fechas.length - 1] : null,
    };
}