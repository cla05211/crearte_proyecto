// Header Content-Disposition seguro para nombres con tildes, comillas u otros caracteres
// (ej. un colegio "San José “Norte”" tiraba error 500 al armar el header).
export const contentDisposition = (tipo: 'inline' | 'attachment', nombreArchivo: string): string =>
{
    const ascii = nombreArchivo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '');
    return `${tipo}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`;
};
