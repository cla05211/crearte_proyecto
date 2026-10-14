import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { WatsappModule } from 'src/watsapp/watsapp.module';
import { ClientesAuthModule } from 'src/clientes-auth/clientes-auth.module';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PermisosService } from 'src/permisos/permisos.service';
import { PedidosService } from 'src/pedidos/pedidos.service';

@Module({
    // Se importan los módulos (que exportan sus services), no los services sueltos.
    imports: [SupabaseModule, WatsappModule, ClientesAuthModule],
    controllers: [NotificacionesController],
    providers: [NotificacionesService, UsuariosService, PermisosService, PedidosService],
    exports: [NotificacionesService],
})
export class NotificacionesModule {}
