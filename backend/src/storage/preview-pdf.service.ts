import { Injectable } from '@nestjs/common';
import { createRequire } from 'module';
import path from 'path';
import { createCanvas } from '@napi-rs/canvas';

// Los bocetos son apaisados. Se generan dos JPG de la primera página:
// - grande (3200px): para el visor, con zoom se leen bien las aclaraciones chicas (~0,6-1 MB)
// - preview (1600px): para miniaturas y el portal de clientes en el celu (~200-300 KB)
const ANCHO_GRANDE = 3200;
const ANCHO_PREVIEW = 1600;
const CALIDAD_JPG = 85;

// pdfjs-dist solo se publica como ESM: se carga con import() dinámico (con module "nodenext" TS lo deja tal cual)
type PdfJs = typeof import('pdfjs-dist/legacy/build/pdf.mjs', { with: { 'resolution-mode': 'import' } });

export interface ImagenesBoceto
{
    preview: Buffer;
    grande: Buffer;
}

@Injectable()
export class PreviewPdfService
{
    private pdfjs?: Promise<PdfJs>;

    // Carpeta de pdfjs-dist: de ahí salen las fuentes estándar (para PDFs que no las traen embebidas)
    private readonly raizPdfjs = path.dirname(createRequire(__filename).resolve('pdfjs-dist/package.json'));

    // Dibuja la primera página del PDF una sola vez (en grande) y de ahí saca la versión chica
    async generarImagenes(pdf: Buffer): Promise<ImagenesBoceto>
    {
        const pdfjs = await this.cargarPdfjs();

        const tarea = pdfjs.getDocument({
            data: new Uint8Array(pdf),
            standardFontDataUrl: this.carpetaPdfjs('standard_fonts'),
            wasmUrl: this.carpetaPdfjs('wasm'),
        });

        try
        {
            const documento = await tarea.promise;
            const pagina = await documento.getPage(1);

            const escala = ANCHO_GRANDE / pagina.getViewport({ scale: 1 }).width;
            const viewport = pagina.getViewport({ scale: escala });

            const grande = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
            const contextoGrande = grande.getContext('2d');

            // Fondo blanco: el JPG no tiene transparencia y sin esto las zonas vacías quedan negras
            contextoGrande.fillStyle = '#ffffff';
            contextoGrande.fillRect(0, 0, grande.width, grande.height);

            await pagina.render({ canvas: grande as any, canvasContext: contextoGrande as any, viewport }).promise;

            const altoPreview = Math.round(grande.height * ANCHO_PREVIEW / grande.width);
            const preview = createCanvas(ANCHO_PREVIEW, altoPreview);
            const contextoPreview = preview.getContext('2d');
            contextoPreview.imageSmoothingQuality = 'high';
            contextoPreview.drawImage(grande, 0, 0, ANCHO_PREVIEW, altoPreview);

            return {
                grande: await grande.encode('jpeg', CALIDAD_JPG),
                preview: await preview.encode('jpeg', CALIDAD_JPG),
            };
        }
        finally
        {
            await tarea.destroy();
        }
    }

    // pdf.js exige que la carpeta termine en "/" (no acepta "\\" de Windows). Node lee igual
    // rutas con barras normales en Windows, así que se pasan todas a "/".
    private carpetaPdfjs(nombre: string): string
    {
        return path.join(this.raizPdfjs, nombre).replace(/\\/g, '/') + '/';
    }

    private cargarPdfjs(): Promise<PdfJs>
    {
        this.pdfjs ??= import('pdfjs-dist/legacy/build/pdf.mjs');
        return this.pdfjs;
    }
}
