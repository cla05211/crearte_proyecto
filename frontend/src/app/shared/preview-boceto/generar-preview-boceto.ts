// Genera en el navegador las dos imágenes JPG de la primera página de un boceto (PDF apaisado):
// - grande (3200 px de ancho): para el visor, con zoom se leen las aclaraciones chicas (~0,6-1 MB)
// - preview (1600 px): para miniaturas y el portal de clientes en el celu (~200-300 KB)
//
// Antes esto lo hacía el backend, pero los bocetos reales pesan ~90 MB y abrirlos en el servidor
// (512 MB de RAM en Render) lo podía dejar sin memoria y tirarlo para todos. Acá usa la memoria
// de la compu de quien sube el archivo.
//
// pdf.js se carga recién cuando se usa (no suma peso al resto de la app). El worker, los .wasm y las
// fuentes estándar se copian a /pdfjs en el build (ver "assets" en angular.json).

const ANCHO_GRANDE = 3200;
const ANCHO_PREVIEW = 1600;
const CALIDAD_JPG = 0.85;

export interface ImagenesBocetoGeneradas
{
    preview: Blob;
    grande: Blob;
}

const rutaPdfjs = (archivo: string): string => new URL(`pdfjs/${archivo}`, document.baseURI).href;

export async function generarImagenesBoceto(pdf: Blob): Promise<ImagenesBocetoGeneradas>
{
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = rutaPdfjs('pdf.worker.min.mjs');

    const tarea = pdfjs.getDocument({
        data: new Uint8Array(await pdf.arrayBuffer()),
        wasmUrl: rutaPdfjs('wasm/'),
        standardFontDataUrl: rutaPdfjs('standard_fonts/'),
    });

    try
    {
        const documento = await tarea.promise;
        const pagina = await documento.getPage(1);

        const escala = ANCHO_GRANDE / pagina.getViewport({ scale: 1 }).width;
        const viewport = pagina.getViewport({ scale: escala });

        const grande = document.createElement('canvas');
        grande.width = Math.round(viewport.width);
        grande.height = Math.round(viewport.height);
        const contextoGrande = grande.getContext('2d')!;

        // Fondo blanco: el JPG no tiene transparencia y sin esto las zonas vacías quedan negras
        contextoGrande.fillStyle = '#ffffff';
        contextoGrande.fillRect(0, 0, grande.width, grande.height);

        await pagina.render({ canvas: grande, canvasContext: contextoGrande, viewport }).promise;

        const preview = document.createElement('canvas');
        preview.width = ANCHO_PREVIEW;
        preview.height = Math.round(grande.height * ANCHO_PREVIEW / grande.width);
        const contextoPreview = preview.getContext('2d')!;
        contextoPreview.imageSmoothingQuality = 'high';
        contextoPreview.drawImage(grande, 0, 0, preview.width, preview.height);

        const [blobGrande, blobPreview] = await Promise.all([aJpg(grande), aJpg(preview)]);

        // Libera la memoria de los canvas enseguida (el grande ocupa ~30 MB)
        grande.width = grande.height = 0;
        preview.width = preview.height = 0;

        return { grande: blobGrande, preview: blobPreview };
    }
    finally
    {
        await tarea.destroy();
    }
}

function aJpg(canvas: HTMLCanvasElement): Promise<Blob>
{
    return new Promise((resolve, reject) =>
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen')), 'image/jpeg', CALIDAD_JPG));
}
