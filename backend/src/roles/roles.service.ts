import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { RolDto } from './dto/rol.dto';
import { InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class RolesService 
{
    constructor(private sb: SupabaseService){}

    async obtenerRoles():Promise<RolDto[]>
    {

        const { data, error } = await this.sb.supabase
        .from("roles")
        .select("rol, nombre_rol")
        
        if(error)
        {
            throw new InternalServerErrorException('No se pudieron conseguir los roles');
        }

        return data as RolDto[];
    }
}
