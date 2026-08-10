import { Module } from '@nestjs/common';
import { ProductosPedidoController } from './productos-pedido.controller';
import { PermisosService } from 'src/permisos/permisos.service';
import { ProductosPedidoService } from './productos-pedido-service.service';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosService } from 'src/usuarios/usuarios.service';

@Module({
  imports:[SupabaseModule],
  controllers: [ProductosPedidoController],
  providers: [PermisosService, ProductosPedidoService, UsuariosService]
})
export class ProductosPedidoModule {}
