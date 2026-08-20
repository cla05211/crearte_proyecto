import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PermisosService } from 'src/permisos/permisos.service';

@Module({
    imports:[SupabaseModule],
    controllers:[DocumentosController],
    providers:[DocumentosService, UsuariosService, PermisosService]
})
export class DocumentosModule {}
