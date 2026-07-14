import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosModule } from 'src/usuarios/usuarios.module';
import { AuthService } from './auth.service';
import { AuthGuard } from 'src/guards/auth.guard';

@Module({
  imports: [SupabaseModule, UsuariosModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthGuard]
})
export class AuthModule {}
