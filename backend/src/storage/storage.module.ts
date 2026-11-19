import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PermisosService } from '../permisos/permisos.service';

@Module({
    imports:[SupabaseModule],
    controllers:[StorageController],
    providers:[StorageService, UsuariosService, PermisosService],
    exports:[StorageService]
})
export class StorageModule {}
