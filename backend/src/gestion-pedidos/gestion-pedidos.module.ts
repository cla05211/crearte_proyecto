import { Module } from '@nestjs/common';
import { GestionPedidosController } from './gestion-pedidos.controller';
import { GestionPedidosService } from './gestion-pedidos.service';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PermisosModule } from 'src/permisos/permisos.module';

@Module({
  imports: [SupabaseModule, PermisosModule],
  controllers: [GestionPedidosController],
  providers: [GestionPedidosService, UsuariosService],
})
export class GestionPedidosModule {}
