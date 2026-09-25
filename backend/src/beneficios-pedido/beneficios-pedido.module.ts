import { Module } from '@nestjs/common';
import { BeneficiosPedidoController } from './beneficios-pedido.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosModule } from 'src/usuarios/usuarios.module';
import { BeneficiosPedidoService } from './beneficios-pedido.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PermisosService } from 'src/permisos/permisos.service';

@Module({
  imports: [SupabaseModule, BeneficiosPedidoModule, UsuariosModule],
  controllers: [BeneficiosPedidoController],
  providers: [BeneficiosPedidoService, SupabaseService, PermisosService]
})
export class BeneficiosPedidoModule {}
