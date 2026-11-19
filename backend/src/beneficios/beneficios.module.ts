import { Module } from '@nestjs/common';
import { BeneficiosController } from './beneficios.controller';
import { BeneficiosService } from './beneficios.service';
import { SupabaseService } from '../supabase/supabase.service';
import { PermisosService } from '../permisos/permisos.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [SupabaseModule, BeneficiosModule, UsuariosModule],
  controllers: [BeneficiosController],
  providers: [BeneficiosService, SupabaseService, PermisosService]
})
export class BeneficiosModule {}
