import { Module } from '@nestjs/common';
import { AuditoriasController } from './auditorias.controller';
import { AuditoriasService } from './auditorias.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AuditoriasController],
  providers: [AuditoriasService, SupabaseService]
})
export class AuditoriasModule {}
