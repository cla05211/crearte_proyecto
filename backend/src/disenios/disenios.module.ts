import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { StorageModule } from 'src/storage/storage.module';
import { ResumenTallesModule } from 'src/resumen-talles/resumen-talles.module';
import { PedidosModule } from 'src/pedidos/pedidos.module';
import { DocumentosService } from 'src/documentos/documentos.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PermisosService } from 'src/permisos/permisos.service';
import { DiseniosController } from './disenios.controller';
import { DiseniosService } from './disenios.service';

@Module({
    imports: [SupabaseModule, StorageModule, ResumenTallesModule, PedidosModule],
    controllers: [DiseniosController],
    providers: [DiseniosService, DocumentosService, UsuariosService, PermisosService],
})
export class DiseniosModule {}
