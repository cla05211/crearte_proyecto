import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PermisosService } from '../permisos/permisos.service';
import { PagosService } from './pagos.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsuariosService } from '../usuarios/usuarios.service';
import { OcrService } from '../ocr/ocr.service';
import { OcrModule } from '../ocr/ocr.module';
import { ReportesModule } from '../reportes/reportes.module';
import { DocumentosService } from '../documentos/documentos.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports:[SupabaseModule, OcrModule, ReportesModule, StorageModule],
  controllers: [PagosController],
  providers:[PermisosService, PagosService, UsuariosService, OcrService, DocumentosService]
})
export class PagosModule {}
