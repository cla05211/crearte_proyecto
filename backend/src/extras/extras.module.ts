import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { StorageModule } from 'src/storage/storage.module';
import { DocumentosService } from 'src/documentos/documentos.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PermisosService } from 'src/permisos/permisos.service';
import { ExtrasController } from './extras.controller';
import { ExtrasService } from './extras.service';

@Module({
    imports: [SupabaseModule, StorageModule],
    controllers: [ExtrasController],
    providers: [ExtrasService, DocumentosService, UsuariosService, PermisosService],
})
export class ExtrasModule {}
