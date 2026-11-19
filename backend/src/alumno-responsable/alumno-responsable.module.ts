import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AlumnoResponsableController } from './alumno-responsable.controller';
import { AlumnoResponsableService } from './alumno-responsable.service';
import { SupabaseService } from '../supabase/supabase.service';
import { PermisosService } from '../permisos/permisos.service';

@Module({
    imports: [SupabaseModule, UsuariosModule],
    controllers: [AlumnoResponsableController],
    providers: [AlumnoResponsableService, SupabaseService, PermisosService]
})
export class AlumnoResponsableModule 
{
    
}
