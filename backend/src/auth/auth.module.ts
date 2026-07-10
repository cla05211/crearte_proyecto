import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosModule } from 'src/usuarios/usuarios.module';

@Module({
  imports: [SupabaseModule, UsuariosModule],
  controllers: [AuthController],
  providers: [AuthModule]
})
export class AuthModule {}
