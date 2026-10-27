// ocr/ocr.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageAnnotatorClient } from '@google-cloud/vision';


@Injectable()
export class OcrService implements OnModuleInit {
  private client!: ImageAnnotatorClient;
  private readonly logger = new Logger(OcrService.name);

  onModuleInit() 
  {
    const credencialesRaw = process.env.GOOGLE_CLOUD_VISION_CREDENTIALS;
    const credenciales = JSON.parse(credencialesRaw!);

    this.client = new ImageAnnotatorClient({ credentials: credenciales });
  }

  async extraerTexto(buffer: Buffer): Promise<string> 
  {
    try 
    {
      const texto = this.esPdf(buffer)
        ? await this.extraerTextoPdf(buffer)
        : (await this.client.documentTextDetection({ image: { content: buffer } }))[0].fullTextAnnotation?.text ?? '';
      
      if (!texto) {
        this.logger.warn('OCR no detectó texto en el comprobante');
      }
      
      return texto;
    } 
    catch (error) 
    {
      this.logger.error('Error al procesar OCR', error);
      throw error;
    }
  }

  // documentTextDetection solo lee imágenes: los PDF van por batchAnnotateFiles
  // (sin indicar páginas lee las primeras 5, de sobra para un comprobante).
  private async extraerTextoPdf(buffer: Buffer): Promise<string>
  {
    const [resultado] = await this.client.batchAnnotateFiles({
      requests: [{
        inputConfig: { mimeType: 'application/pdf', content: buffer },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      }],
    });

    const paginas = resultado.responses?.[0]?.responses ?? [];
    return paginas.map(pagina => pagina.fullTextAnnotation?.text ?? '').join('\n');
  }

  // Se mira el contenido ("%PDF" al principio) y no el nombre ni el mimetype que manda el navegador
  private esPdf(buffer: Buffer): boolean
  {
    return buffer.subarray(0, 4).toString('latin1') === '%PDF';
  }
}