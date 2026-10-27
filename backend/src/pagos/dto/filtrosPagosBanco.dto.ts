// Filtros de Cuentas Bancarias. Llegan como query params (texto); las fechas en formato YYYY-MM-DD.
export class FiltrosPagosBancoDTO
{
    busqueda?: string;
    recepcionDesde?: string;
    recepcionHasta?: string;
    pagoDesde?: string;
    pagoHasta?: string;
    montoDesde?: string;
    montoHasta?: string;
    aprobado?: string;
    enviado?: string;
}
