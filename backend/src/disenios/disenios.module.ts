import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { StorageModule } from '../storage/storage.module';
import { ResumenTallesModule } from '../resumen-talles/resumen-talles.module';
import { PedidosModule } from '../pedidos/pedidos.module';
import { DocumentosService } from '../documentos/documentos.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PermisosService } from '../permisos/permisos.service';
import { DiseniosController } from './disenios.controller';
import { DiseniosService } from './disenios.service';
import { GestionPedidosModule } from '../gestion-pedidos/gestion-pedidos.module';
import { PrendasPedidoTallesService } from '../prendas-pedido-talles/prendas-pedido-talles.service';
import { ProductosService } from '../productos/productos.service';
import { RecalculoPlanTallesService } from '../prendas-pedido-talles/recalculo-plan-talles.service';
import { AuditoriasService } from '../auditorias/auditorias.service';

@Module({
    imports: [SupabaseModule, StorageModule, ResumenTallesModule, PedidosModule, GestionPedidosModule],
    controllers: [DiseniosController],
    providers: [DiseniosService, DocumentosService, UsuariosService, PermisosService, PrendasPedidoTallesService, ProductosService, RecalculoPlanTallesService, AuditoriasService],
    exports:[DiseniosService]
})
export class DiseniosModule {}
