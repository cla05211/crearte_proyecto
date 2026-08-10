import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PermisosService } from 'src/permisos/permisos.service';
import { PagosService } from './pagos.service';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosService } from 'src/usuarios/usuarios.service';

@Module({
  imports:[SupabaseModule],
  controllers: [PagosController],
  providers:[PermisosService, PagosService, UsuariosService]
})
export class PagosModule {}
