import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { GruposService } from './grupos.service';
import { PermisosService } from 'src/permisos/permisos.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { GruposController } from './grupos.controller';

@Module({
    imports:[SupabaseModule],
    providers:[GruposService, PermisosService, UsuariosService],
    controllers:[GruposController]
})
export class GruposModule {}
