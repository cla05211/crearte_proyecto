import { Module } from '@nestjs/common';
import { CuotasService } from 'src/cuotas/cuotas.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { GestionPedidosService } from 'src/gestion-pedidos/gestion-pedidos.service';
import { PagosService } from 'src/pagos/pagos.service';
import { PedidosService } from 'src/pedidos/pedidos.service';
import { ProductosPedidoService } from 'src/productos-pedido/productos-pedido-service.service';
import { StorageService } from 'src/storage/storage.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { ClientesPortalController } from './clientes-portal.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { OcrModule } from 'src/ocr/ocr.module';
import { ReportesModule } from 'src/reportes/reportes.module';
import { GestionPedidosModule } from 'src/gestion-pedidos/gestion-pedidos.module';
import { StorageModule } from 'src/storage/storage.module';
import { GruposService } from 'src/grupos/grupos.service';
import { PrendasPedidoTallesService } from 'src/prendas-pedido-talles/prendas-pedido-talles.service';
import { PdfService } from 'src/reportes/pdf/pdf.service';
import { ProductosService } from 'src/productos/productos.service';
import { BeneficiosPedidoService } from 'src/beneficios-pedido/beneficios-pedido.service';

@Module({
    imports:[SupabaseModule, OcrModule, ReportesModule, GestionPedidosModule, StorageModule],
    controllers: [ClientesPortalController],
    providers:[PrendasPedidoTallesService,PedidosService, PagosService, CuotasService, ProductosPedidoService, DocumentosService, SupabaseService, GruposService, ProductosService, BeneficiosPedidoService]
})
export class ClientesPortalModule {

}
