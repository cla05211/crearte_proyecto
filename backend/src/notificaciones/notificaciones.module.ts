import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { WatsappService } from 'src/watsapp/watsapp.service';
import { NotificacionesService } from './notificaciones.service';

@Module({
    imports:[SupabaseModule],
    providers:[NotificacionesService, WatsappService]
})
export class NotificacionesModule {}
