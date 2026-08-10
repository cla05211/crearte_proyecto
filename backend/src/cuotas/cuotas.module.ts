import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { CuotasService } from './cuotas.service';
import { CuotasController } from './cuotas.controller';
import { PermisosService } from 'src/permisos/permisos.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';

@Module({
    imports:[SupabaseModule],
    providers:[CuotasService, PermisosService, UsuariosService],
    controllers:[CuotasController]
})
export class CuotasModule {}
