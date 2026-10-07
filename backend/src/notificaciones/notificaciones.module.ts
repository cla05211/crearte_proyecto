import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { WatsappModule } from 'src/watsapp/watsapp.module';
import { ClientesAuthModule } from 'src/clientes-auth/clientes-auth.module';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';

@Module({
    // Se importan los módulos (que exportan sus services), no los services sueltos.
    imports: [SupabaseModule, WatsappModule, ClientesAuthModule],
    controllers: [NotificacionesController],
    providers: [NotificacionesService],
    exports: [NotificacionesService],
})
export class NotificacionesModule {}
