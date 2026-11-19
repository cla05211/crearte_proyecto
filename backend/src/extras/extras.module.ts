import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { StorageModule } from '../storage/storage.module';
import { DocumentosService } from '../documentos/documentos.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PermisosService } from '../permisos/permisos.service';
import { ExtrasController } from './extras.controller';
import { ExtrasService } from './extras.service';

@Module({
    imports: [SupabaseModule, StorageModule],
    controllers: [ExtrasController],
    providers: [ExtrasService, DocumentosService, UsuariosService, PermisosService],
})
export class ExtrasModule {}
