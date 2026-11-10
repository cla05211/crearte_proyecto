// Fechas en hora de Argentina, independientes de la zona horaria del servidor (Render corre en UTC).
const ZONA_ARGENTINA = 'America/Argentina/Buenos_Aires';

// "2026-11-10"
export const hoyArgentina = (fecha: Date = new Date()): string =>
    new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_ARGENTINA }).format(fecha);

export const anioArgentina = (fecha: Date = new Date()): number => Number(hoyArgentina(fecha).slice(0, 4));

// Medianoche argentina de ese día como instante ISO (para comparar contra timestamps guardados en UTC)
export const inicioDiaArgentina = (anio: number, mes: number, dia: number): string =>
    new Date(`${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T00:00:00-03:00`).toISOString();

// Año pedido por query (?anio=2027); si no viene o es inválido, el año actual en Argentina
export const anioOActual = (anio?: number | string | null): number =>
{
    const numero = Number(anio);
    return Number.isInteger(numero) && numero >= 2000 && numero <= 2100 ? numero : anioArgentina();
};
