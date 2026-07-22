import { Module } from '@nestjs/common';
import { GestionPedidosController } from './gestion-pedidos.controller';
import { GestionPedidosService } from './gestion-pedidos.service';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PermisosModule } from 'src/permisos/permisos.module';
import { ColegiosService } from 'src/colegios/colegios.service';
import { GruposService } from 'src/grupos/grupos.service';
import { PedidosService } from 'src/pedidos/pedidos.service';
import { ProductosPedidoService } from 'src/productos-pedido/productos-pedido-service.service';
import { PadreResponsableService } from 'src/padre-responsable/padre-responsable-service.service';
import { AlumnoResponsableService } from 'src/alumno-responsable/alumno-responsable.service';
import { PagosService } from 'src/pagos/pagos.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { CuentaCorrienteService } from 'src/cuenta-corriente/CuentaCorriente.service';
import { CuotasService } from 'src/cuotas/cuotas.service';

@Module({
  imports: [SupabaseModule, PermisosModule],
  controllers: [GestionPedidosController],
  providers: [GestionPedidosService, UsuariosService, ColegiosService, 
            GruposService, PedidosService, ProductosPedidoService, PadreResponsableService,
            AlumnoResponsableService, PagosService, DocumentosService, PagosService, CuentaCorrienteService,
            CuotasService],
})
export class GestionPedidosModule {}
