// Limpia el texto de búsqueda antes de meterlo en un filtro .or(...) de Supabase:
// comas, paréntesis y comillas rompen la sintaxis del filtro (ej. "San Martín, Rosario" daba error 400).
export const limpiarBusqueda = (texto?: string | null): string =>
    (texto ?? '').replace(/[,()"]/g, ' ').replace(/\s+/g, ' ').trim();
