import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { StorageService } from './storage.service';
import { PreviewPdfService } from './preview-pdf.service';
import { StorageController } from './storage.controller';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PermisosService } from 'src/permisos/permisos.service';

@Module({
    imports:[SupabaseModule],
    controllers:[StorageController],
    providers:[StorageService, PreviewPdfService, UsuariosService, PermisosService],
    exports:[StorageService, PreviewPdfService]
})
export class StorageModule {}
