import { Module } from '@nestjs/common';
import { GestionPedidosController } from './gestion-pedidos.controller';
import { GestionPedidosService } from './gestion-pedidos.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PermisosModule } from '../permisos/permisos.module';
import { ColegiosService } from '../colegios/colegios.service';
import { GruposService } from '../grupos/grupos.service';
import { PedidosService } from '../pedidos/pedidos.service';
import { ProductosPedidoService } from '../productos-pedido/productos-pedido-service.service';
import { PadreResponsableService } from '../padre-responsable/padre-responsable-service.service';
import { AlumnoResponsableService } from '../alumno-responsable/alumno-responsable.service';
import { PagosService } from '../pagos/pagos.service';
import { DocumentosService } from '../documentos/documentos.service';
import { CuentaCorrienteService } from '../cuenta-corriente/CuentaCorriente.service';
import { CuotasService } from '../cuotas/cuotas.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditoriasService } from '../auditorias/auditorias.service';
import { OcrModule } from '../ocr/ocr.module';
import { AgregadosGlobalesPedidoModule } from '../agregados-globales-pedido/agregados-globales-pedido.module';
import { BeneficiosPedidoService } from '../beneficios-pedido/beneficios-pedido.service';

@Module({
  imports: [SupabaseModule, PermisosModule, OcrModule, AgregadosGlobalesPedidoModule],
  controllers: [GestionPedidosController],
  providers: [GestionPedidosService, UsuariosService, ColegiosService,
            GruposService, PedidosService, ProductosPedidoService, PadreResponsableService,
            AlumnoResponsableService, PagosService, DocumentosService, PagosService, CuentaCorrienteService,
            CuotasService, SupabaseService, AuditoriasService, BeneficiosPedidoService],
  exports:[GestionPedidosService]
})
export class GestionPedidosModule {}
