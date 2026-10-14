import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { GestionPedidosModule } from 'src/gestion-pedidos/gestion-pedidos.module';
import { StorageModule } from 'src/storage/storage.module';
import { ReportesModule } from 'src/reportes/reportes.module';
import { PedidosModule } from 'src/pedidos/pedidos.module';
import { GruposService } from 'src/grupos/grupos.service';
import { PrendasPedidoTallesService } from 'src/prendas-pedido-talles/prendas-pedido-talles.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { ResumenTallesService } from './resumen-talles.service';

@Module({
    imports: [SupabaseModule, GestionPedidosModule, StorageModule, ReportesModule, PedidosModule],
    providers: [ResumenTallesService, GruposService, PrendasPedidoTallesService, DocumentosService],
    exports: [ResumenTallesService],
})
export class ResumenTallesModule {}
