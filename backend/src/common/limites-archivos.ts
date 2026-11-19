import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const MB = 1024 * 1024;

// Opciones de Multer para FileInterceptor: limitan tamaño y tipo de archivo.
// Sin esto, Multer acepta archivos de cualquier tamaño en memoria y uno muy grande puede tirar el servidor.
const crearOpciones = (maxMb: number, tiposPermitidos: RegExp): MulterOptions => ({
    limits: { fileSize: maxMb * MB, files: 1 },
    fileFilter: (_req, archivo, callback) =>
    {
        if (!tiposPermitidos.test(archivo.mimetype) || archivo.mimetype === 'image/svg+xml')
        {
            return callback(new BadRequestException({ code: 'TIPO_ARCHIVO_INVALIDO', message: 'Tipo de archivo no permitido.' }), false);
        }
        callback(null, true);
    },
});

// Firmas dibujadas en el portal (se mandan como PNG; pesan pocos KB).
// Son el único archivo que sigue pasando por el back: el límite queda bajo los 4.5 MB que acepta una función de Vercel.
// El resto de los archivos se sube directo a Supabase (ver archivos-subida.ts).
export const OPCIONES_FIRMA = crearOpciones(4, /^image\/(png|jpeg)$/);
