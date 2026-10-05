export interface EstadoSenia
{
    total: number;     
    pagado: number;     
    restante: number;   
    completa: boolean;
    fechaUltimoPago: string | null;  
}

export function calcularEstadoSenia(productos: { valor_senia: number; cantidad: number }[],
pagos: { monto: number | null; motivo: string | null; fecha: string | null }[],): EstadoSenia
{
    const total = productos.reduce((suma, p) => suma + p.valor_senia * p.cantidad, 0);

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