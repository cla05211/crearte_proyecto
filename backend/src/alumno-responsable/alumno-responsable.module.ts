import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosModule } from 'src/usuarios/usuarios.module';
import { AlumnoResponsableController } from './alumno-responsable.controller';
import { AlumnoResponsableService } from './alumno-responsable.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { PermisosService } from 'src/permisos/permisos.service';

@Module({
    imports: [SupabaseModule, UsuariosModule],
    controllers: [AlumnoResponsableController],
    providers: [AlumnoResponsableService, SupabaseService, PermisosService]
})
export class AlumnoResponsableModule 
{
    
}
