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
      const [resultado] = await this.client.documentTextDetection({ image: { content: buffer } });
      const texto = resultado.fullTextAnnotation?.text ?? '';
      
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
}