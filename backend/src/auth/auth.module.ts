import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosModule } from 'src/usuarios/usuarios.module';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { PermisosService } from 'src/permisos/permisos.service';

@Module({
  imports: [SupabaseModule, UsuariosModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, PermisosService],
  exports: [AuthGuard]
})
export class AuthModule {}
