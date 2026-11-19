import { Module } from '@nestjs/common';
import { ProductosController } from './productos.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PermisosService } from '../permisos/permisos.service';
import { ProductosService } from './productos.service';

@Module({
  imports:[SupabaseModule],
  controllers: [ProductosController],
  providers:[ProductosService, UsuariosService, PermisosService]
})
export class ProductosModule {}
