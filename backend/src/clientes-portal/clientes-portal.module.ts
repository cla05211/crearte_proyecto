import { Module } from '@nestjs/common';
import { CuotasService } from '../cuotas/cuotas.service';
import { DocumentosService } from '../documentos/documentos.service';
import { GestionPedidosService } from '../gestion-pedidos/gestion-pedidos.service';
import { PagosService } from '../pagos/pagos.service';
import { PedidosService } from '../pedidos/pedidos.service';
import { ProductosPedidoService } from '../productos-pedido/productos-pedido-service.service';
import { StorageService } from '../storage/storage.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ClientesPortalController } from './clientes-portal.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { OcrModule } from '../ocr/ocr.module';
import { ReportesModule } from '../reportes/reportes.module';
import { GestionPedidosModule } from '../gestion-pedidos/gestion-pedidos.module';
import { StorageModule } from '../storage/storage.module';
import { GruposService } from '../grupos/grupos.service';
import { PrendasPedidoTallesService } from '../prendas-pedido-talles/prendas-pedido-talles.service';
import { PdfService } from '../reportes/pdf/pdf.service';
import { ProductosService } from '../productos/productos.service';
import { BeneficiosPedidoService } from '../beneficios-pedido/beneficios-pedido.service';
import { PadreResponsableService } from '../padre-responsable/padre-responsable-service.service';
import { ContratosModule } from '../contratos/contratos.module';
import { ResumenTallesModule } from '../resumen-talles/resumen-talles.module';
import { DiseniosModule } from '../disenios/disenios.module';
import { RecalculoPlanTallesService } from '../prendas-pedido-talles/recalculo-plan-talles.service';
import { AuditoriasService } from '../auditorias/auditorias.service';

@Module({
    imports:[SupabaseModule, OcrModule, ReportesModule, GestionPedidosModule, StorageModule, ContratosModule, ResumenTallesModule, DiseniosModule],
    controllers: [ClientesPortalController],
    providers:[PrendasPedidoTallesService,PedidosService, PagosService, CuotasService, ProductosPedidoService, DocumentosService, SupabaseService, GruposService, ProductosService, BeneficiosPedidoService, PadreResponsableService, RecalculoPlanTallesService, AuditoriasService]
})
export class ClientesPortalModule {

}
