import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { CuotasService } from './cuotas.service';
import { CuotasController } from './cuotas.controller';
import { PermisosService } from 'src/permisos/permisos.service';

@Module({
    imports:[SupabaseModule],
    providers:[CuotasService, PermisosService],
    controllers:[CuotasController]
})
export class CuotasModule {}
