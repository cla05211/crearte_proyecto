import { Module } from '@nestjs/common';
import { BeneficiosController } from './beneficios.controller';
import { BeneficiosService } from './beneficios.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PermisosService } from 'src/permisos/permisos.service';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosModule } from 'src/usuarios/usuarios.module';

@Module({
  imports: [SupabaseModule, BeneficiosModule, UsuariosModule],
  controllers: [BeneficiosController],
  providers: [BeneficiosService, SupabaseService, PermisosService]
})
export class BeneficiosModule {}
