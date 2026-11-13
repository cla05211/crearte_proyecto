import { Module } from '@nestjs/common';
import { AgregadosService } from './agregados.service';
import { AgregadosController } from './agregados.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PermisosService } from 'src/permisos/permisos.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AgregadosController],
  providers: [AgregadosService, UsuariosService, PermisosService]
})
export class AgregadosModule {}
