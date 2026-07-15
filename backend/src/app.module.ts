import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseService } from './supabase/supabase.service';
import { AuthService } from './auth/auth.service';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesController } from './roles/roles.controller';
import { RolesModule } from './roles/roles.module';
import { RolesService } from './roles/roles.service';
import { PermisosService } from './permisos/permisos.service';
import { PermisosModule } from './permisos/permisos.module';


@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true,
    }), SupabaseModule, AuthModule, UsuariosModule, RolesModule, PermisosModule,],
  controllers: [AppController, RolesController],
  providers: [AppService, RolesService, PermisosService],
})
export class AppModule {}
