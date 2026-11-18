import { Module } from '@nestjs/common';
import { GestionEnviosPedidosService } from './gestion-envios-pedidos.service';
import { GestionEnviosPedidosController } from './gestion-envios-pedidos.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { StorageModule } from 'src/storage/storage.module';
import { DocumentosService } from 'src/documentos/documentos.service';
import { MovimientosCajaService } from 'src/movimientos-caja/movimientos-caja.service';
import { PedidosService } from 'src/pedidos/pedidos.service';
import { PermisosService } from 'src/permisos/permisos.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';

@Module({
  imports: [SupabaseModule, StorageModule],
  controllers: [GestionEnviosPedidosController],
  providers: [GestionEnviosPedidosService, DocumentosService, MovimientosCajaService, PedidosService, PermisosService, UsuariosService],
})
export class GestionEnviosPedidosModule {}
