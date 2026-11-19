import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CuotasService } from './cuotas.service';
import { CuotasController } from './cuotas.controller';
import { PermisosService } from '../permisos/permisos.service';
import { UsuariosService } from '../usuarios/usuarios.service';

@Module({
    imports:[SupabaseModule],
    providers:[CuotasService, PermisosService, UsuariosService],
    controllers:[CuotasController]
})
export class CuotasModule {}
