import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { GestionPedidosModule } from '../gestion-pedidos/gestion-pedidos.module';
import { StorageModule } from '../storage/storage.module';
import { ReportesModule } from '../reportes/reportes.module';
import { PedidosModule } from '../pedidos/pedidos.module';
import { GruposService } from '../grupos/grupos.service';
import { PrendasPedidoTallesService } from '../prendas-pedido-talles/prendas-pedido-talles.service';
import { DocumentosService } from '../documentos/documentos.service';
import { ResumenTallesService } from './resumen-talles.service';

@Module({
    imports: [SupabaseModule, GestionPedidosModule, StorageModule, ReportesModule, PedidosModule],
    providers: [ResumenTallesService, GruposService, PrendasPedidoTallesService, DocumentosService],
    exports: [ResumenTallesService],
})
export class ResumenTallesModule {}
