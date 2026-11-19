import { Module } from '@nestjs/common';
import { BeneficiosPedidoController } from './beneficios-pedido.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { BeneficiosPedidoService } from './beneficios-pedido.service';
import { SupabaseService } from '../supabase/supabase.service';
import { PermisosService } from '../permisos/permisos.service';
import { AuditoriasService } from '../auditorias/auditorias.service';

@Module({
  imports: [SupabaseModule, BeneficiosPedidoModule, UsuariosModule],
  controllers: [BeneficiosPedidoController],
  providers: [BeneficiosPedidoService, SupabaseService, PermisosService, AuditoriasService]
})
export class BeneficiosPedidoModule {}
