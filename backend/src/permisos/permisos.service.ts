import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class PermisosService 
{
    constructor(private sb:SupabaseService){}

    async obtenerPermisosRol(rolNro: number):Promise<string[]>
    {
        const { data: relaciones, error: errorRelaciones } = await this.sb.supabase
            .from('roles_permisos')
            .select('permiso_id')
            .eq('rol_nro', rolNro);

        if(errorRelaciones)
        {
            throw new InternalServerErrorException('No se pudieron conseguir los permisos del rol');
        }

        if(!relaciones || relaciones.length === 0)
        {
            return [];
        }

        const permisoIds = relaciones.map(r => r.permiso_id);

        const { data: permisos, error: errorPermisos } = await this.sb.supabase
            .from('permisos')
            .select('nombre')
            .in('id', permisoIds);

        if(errorPermisos)
        {
            throw new InternalServerErrorException('No se pudieron conseguir los permisos');
        }

        return permisos.map(p => p.nombre);
    }

    async tienePermiso(rolNro: number, permiso: string): Promise<boolean>
    {
        const permisos = await this.obtenerPermisosRol(rolNro);
        return permisos.includes(permiso);
    }
}

