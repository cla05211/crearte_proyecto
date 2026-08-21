import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { MovimientosCajaService } from './movimientos-caja.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PermisosService } from 'src/permisos/permisos.service';
import { MovimientosCajaController } from './movimientos-caja.controller';

@Module({
  imports:[SupabaseModule],
  controllers: [MovimientosCajaController],
  providers:[MovimientosCajaService, UsuariosService, PermisosService]    
})
export class MovimientosCajaModule {}
