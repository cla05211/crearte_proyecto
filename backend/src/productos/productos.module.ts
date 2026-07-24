import { Module } from '@nestjs/common';
import { ProductosController } from './productos.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PermisosService } from 'src/permisos/permisos.service';
import { ProductosService } from './productos.service';

@Module({
  imports:[SupabaseModule],
  controllers: [ProductosController],
  providers:[ProductosService, UsuariosService, PermisosService]
})
export class ProductosModule {}
