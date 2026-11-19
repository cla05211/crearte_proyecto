import { Module } from '@nestjs/common';
import { GestionEnviosPedidosService } from './gestion-envios-pedidos.service';
import { GestionEnviosPedidosController } from './gestion-envios-pedidos.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { StorageModule } from '../storage/storage.module';
import { DocumentosService } from '../documentos/documentos.service';
import { MovimientosCajaService } from '../movimientos-caja/movimientos-caja.service';
import { PedidosService } from '../pedidos/pedidos.service';
import { PermisosService } from '../permisos/permisos.service';
import { UsuariosService } from '../usuarios/usuarios.service';

@Module({
  imports: [SupabaseModule, StorageModule],
  controllers: [GestionEnviosPedidosController],
  providers: [GestionEnviosPedidosService, DocumentosService, MovimientosCajaService, PedidosService, PermisosService, UsuariosService],
})
export class GestionEnviosPedidosModule {}
