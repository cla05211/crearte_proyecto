import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { PermisosService } from 'src/permisos/permisos.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PadreResponsableController } from './padre-responsable.controller';
import { PadreResponsableService } from './padre-responsable-service.service';

@Module({
  imports:[SupabaseModule],
  controllers:[PadreResponsableController],
  providers: [PadreResponsableService, PermisosService, UsuariosService],

})
export class PadreResponsableModule {}
