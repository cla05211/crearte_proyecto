import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { MovimientosCajaService } from './movimientos-caja.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PermisosService } from '../permisos/permisos.service';
import { MovimientosCajaController } from './movimientos-caja.controller';

@Module({
  imports:[SupabaseModule],
  controllers: [MovimientosCajaController],
  providers:[MovimientosCajaService, UsuariosService, PermisosService]    
})
export class MovimientosCajaModule {}
