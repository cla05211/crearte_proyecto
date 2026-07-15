import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { PermisosService } from './permisos.service';
import { PermisosGuard } from './guards/permisos.guard';

@Module({
    imports: [SupabaseModule],
    providers: [PermisosService, PermisosGuard], 
    exports:[PermisosService]
})
export class PermisosModule {}
