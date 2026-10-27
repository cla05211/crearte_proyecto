// Filtros de Cuentas Bancarias (fechas en formato YYYY-MM-DD; '' = sin filtro)
export interface FiltrosPagosBanco
{
    recepcionDesde: string;
    recepcionHasta: string;
    pagoDesde: string;
    pagoHasta: string;
    montoDesde: string;
    montoHasta: string;
    aprobado: '' | 'true' | 'false';
    enviado: '' | 'true' | 'false';
}
