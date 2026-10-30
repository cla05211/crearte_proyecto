import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { StorageModule } from 'src/storage/storage.module';
import { ResumenTallesModule } from 'src/resumen-talles/resumen-talles.module';
import { PedidosModule } from 'src/pedidos/pedidos.module';
import { DocumentosService } from 'src/documentos/documentos.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PermisosService } from 'src/permisos/permisos.service';
import { DiseniosController } from './disenios.controller';
import { DiseniosService } from './disenios.service';
import { GestionPedidosModule } from 'src/gestion-pedidos/gestion-pedidos.module';
import { PrendasPedidoTallesService } from 'src/prendas-pedido-talles/prendas-pedido-talles.service';
import { ProductosService } from 'src/productos/productos.service';
import { RecalculoPlanTallesService } from 'src/prendas-pedido-talles/recalculo-plan-talles.service';
import { AuditoriasService } from 'src/auditorias/auditorias.service';

@Module({
    imports: [SupabaseModule, StorageModule, ResumenTallesModule, PedidosModule, GestionPedidosModule],
    controllers: [DiseniosController],
    providers: [DiseniosService, DocumentosService, UsuariosService, PermisosService, PrendasPedidoTallesService, ProductosService, RecalculoPlanTallesService, AuditoriasService],
    exports:[DiseniosService]
})
export class DiseniosModule {}
