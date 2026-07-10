import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseService } from './supabase/supabase.service';
import { AuthService } from './auth/auth.service';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true,
    }), SupabaseModule, AuthModule, UsuariosModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
