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

// Comprobantes de pago: cualquier imagen (menos SVG) o PDF
export const OPCIONES_COMPROBANTE = crearOpciones(15, /^(image\/[a-z0-9.+-]+|application\/pdf)$/);

// Firmas dibujadas en el portal (se mandan como PNG)
export const OPCIONES_FIRMA = crearOpciones(5, /^image\/(png|jpeg)$/);

// Archivos que suben los empleados desde Ventas (recursos adicionales)
export const OPCIONES_ARCHIVO_GENERAL = crearOpciones(100, /.*/);
