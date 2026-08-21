import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { MovimientosCajaService } from './movimientos-caja.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PermisosService } from 'src/permisos/permisos.service';

@Module({
  imports:[SupabaseModule],
  controllers: [MovimientosCajaService],
  providers:[MovimientosCajaService, UsuariosService, PermisosService]    
})
export class MovimientosCajaModule {}
