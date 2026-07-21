import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseService } from './supabase/supabase.service';
import { AuthService } from './auth/auth.service';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesController } from './roles/roles.controller';
import { RolesModule } from './roles/roles.module';
import { RolesService } from './roles/roles.service';
import { PermisosService } from './permisos/permisos.service';
import { PermisosModule } from './permisos/permisos.module';
import { PedidosService } from './pedidos/pedidos.service';
import { PedidosController } from './pedidos/pedidos.controller';
import { PedidosModule } from './pedidos/pedidos.module';
import { GestionPedidosService } from './gestion-pedidos/gestion-pedidos.service';
import { GestionPedidosModule } from './gestion-pedidos/gestion-pedidos.module';
import { ColegiosService } from './colegios/colegios-service.service';
import { ProductosPedidoService } from './productos-pedido/productos-pedido-service.service';
import { PadreResponsableService } from './padre-responsable/padre-responsable-service.service';
import { AlumnoResponsableService } from './alumno-responsable/alumno-responsable-service.service';
import { PagosService } from './pagos/pagos.service';
import { GruposService } from './grupos/grupos.service';
import { MovimientosService } from './movimientos/movimientos.service';
import { DocumentosService } from './documentos/documentos.service';
import { CuotasService } from './cuotas/cuotas.service';


@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true,
    }), SupabaseModule, AuthModule, UsuariosModule, RolesModule, PermisosModule, PedidosModule, GestionPedidosModule,],
  controllers: [AppController, RolesController, PedidosController],
  providers: [AppService, RolesService, PermisosService, PedidosService, GestionPedidosService, ColegiosService, GruposService, ProductosPedidoService, PadreResponsableService, AlumnoResponsableService, PagosService, MovimientosService, DocumentosService, CuotasService],
})
export class AppModule {}
