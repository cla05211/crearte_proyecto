import { Module } from '@nestjs/common';
import { AgregadosService } from './agregados.service';
import { AgregadosController } from './agregados.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PermisosService } from '../permisos/permisos.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AgregadosController],
  providers: [AgregadosService, UsuariosService, PermisosService]
})
export class AgregadosModule {}
