import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PermisosService } from 'src/permisos/permisos.service';
import { PagosService } from './pagos.service';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { OcrService } from 'src/ocr/ocr.service';
import { OcrModule } from 'src/ocr/ocr.module';
import { ReportesModule } from 'src/reportes/reportes.module';

@Module({
  imports:[SupabaseModule, OcrModule, ReportesModule],
  controllers: [PagosController],
  providers:[PermisosService, PagosService, UsuariosService, OcrService]
})
export class PagosModule {}
