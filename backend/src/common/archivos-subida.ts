import { BadRequestException } from '@nestjs/common';

// Archivos que el navegador sube DIRECTO a Supabase con una URL firmada (no pasan por Nest).
// En Vercel las funciones no aceptan pedidos de más de 4.5 MB, así que los archivos no pueden viajar por el back.
// Flujo: 1) el front pide la URL firmada (acá se valida el tipo declarado y se arma la ruta),
//        2) sube el archivo con un PUT directo a Supabase,
//        3) avisa al back con la ruta, y el back revisa en Storage que el archivo exista, su tipo y su tamaño.

const MB = 1024 * 1024;

export interface ReglasArchivo
{
    maxBytes: number;
    tipos: RegExp;
}

// Comprobantes de pago / envío: cualquier imagen (menos SVG) o PDF
export const REGLAS_COMPROBANTE: ReglasArchivo = { maxBytes: 15 * MB, tipos: /^(image\/[a-z0-9.+-]+|application\/pdf)$/ };

// Boceto firmado (JPG o PNG) que el cliente manda por WhatsApp
export const REGLAS_FIRMADO_DISENIO: ReglasArchivo = { maxBytes: 10 * MB, tipos: /^image\/(jpeg|png)$/ };

// Archivos que suben los empleados desde Ventas (comprobantes de seña y recursos adicionales)
export const REGLAS_ARCHIVO_GENERAL: ReglasArchivo = { maxBytes: 100 * MB, tipos: /.*/ };

// Carpeta de los comprobantes que se suben solo para leerlos con OCR; se borran apenas se leen
export const CARPETA_OCR_TEMPORAL = 'ocr-temporal';

export function validarTipoArchivo(mimetype: string | undefined, reglas: ReglasArchivo): string
{
    const tipo = (mimetype ?? '').trim().toLowerCase();

    if (!tipo || !reglas.tipos.test(tipo) || tipo === 'image/svg+xml')
    {
        throw new BadRequestException({ code: 'TIPO_ARCHIVO_INVALIDO', message: 'Tipo de archivo no permitido.' });
    }

    return tipo;
}

// Saca tildes y caracteres raros para que el nombre sirva como ruta de Storage
export function limpiarNombreArchivo(nombre: string | undefined): string
{
    const limpio = (nombre ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .slice(-120);

    return limpio || 'archivo';
}

// Una ruta que llega del front tiene que empezar con el prefijo que armó el back y no puede salir de esa carpeta
export function validarPrefijoRuta(ruta: string | undefined, prefijo: string): string
{
    if (!ruta || !ruta.startsWith(prefijo) || ruta.includes('..') || ruta.slice(prefijo.length).includes('/'))
    {
        throw new BadRequestException('La ruta del archivo no es válida.');
    }

    return ruta;
}
