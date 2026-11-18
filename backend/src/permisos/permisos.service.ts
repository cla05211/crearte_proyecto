import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class PermisosService 
{
    constructor(private sb:SupabaseService){}

    async obtenerPermisosRol(rolNro: number):Promise<string[]>
    {
        // Una sola consulta: roles_permisos con el nombre del permiso embebido (FK permiso_id -> permisos)
        const { data, error } = await this.sb.supabase
            .from('roles_permisos')
            .select('permisos(nombre)')
            .eq('rol_nro', rolNro);

        if(error)
        {
            throw new InternalServerErrorException('No se pudieron conseguir los permisos del rol');
        }

        return (data ?? []).map(r => r.permisos?.nombre).filter((nombre): nombre is string => !!nombre);
    }

    async tienePermiso(rolNro: number, permiso: string): Promise<boolean>
    {
        const permisos = await this.obtenerPermisosRol(rolNro);
        return permisos.includes(permiso);
    }
}

