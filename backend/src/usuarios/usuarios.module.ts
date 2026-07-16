import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosController } from './usuarios.controller';
import { Reflector } from '@nestjs/core';
import { PermisosService } from 'src/permisos/permisos.service';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [SupabaseModule, UsuariosModule, Reflector],
  providers: [UsuariosService, PermisosService],
  exports: [UsuariosService],
  controllers: [UsuariosController]
})
export class UsuariosModule {}
