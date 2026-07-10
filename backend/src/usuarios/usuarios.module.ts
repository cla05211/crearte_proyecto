import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  imports: [SupabaseModule, UsuariosModule],
  providers: [UsuariosService],
  exports: [UsuariosService]
})
export class UsuariosModule {}
