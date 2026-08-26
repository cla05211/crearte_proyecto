import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { GrupoDTO } from './dto/grupo.dto';
import { BadRequestException } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { grupoClientePageResponseDTO } from './dto/grupoClientePage.dto copy';

@Injectable()
export class GruposService 
{
    constructor(private sb: SupabaseService){}
    
    async crearGrupo(dto: GrupoDTO)
    {
        const {data,error} = await this.sb.supabase
            .from('grupos')
            .insert(dto)
            .select('id')
            .single();

        if (error) 
        {
            switch (error.code) 
            {
            case 'SIGNUP_ERROR':
                throw new ConflictException({
                    code: 'GROUP_ALREADY_EXISTS',
                    message: 'El grupo que esta intentando ingresar ya ha sido registrado en el sistema.',
                });
            default:
                throw new BadRequestException({
                    code: 'ERROR',
                    message: error.message,
                });
            }
        }

        return data.id;
    }

    async traerGruposClientePage(rangoDesde: number, rangoHasta:number, busqueda?:string):Promise<grupoClientePageResponseDTO[]>
    {
        let query = this.sb.supabase
        .from("padres_responsables")
        .select(`nombre,apellido,id_grupo,grupos!inner (nivel,colegios!inner (nombre))`)
        .not('mail', 'is', null)
        .neq('mail', '')
        .order("fecha", {ascending: false,});

        if(busqueda)
        {
            query = query.ilike('grupos.colegios.nombre', `%${busqueda}%`);
        }

        const { data, error } = await query.range(rangoDesde, rangoHasta);

        if (error) 
        {
            throw new Error(error.message);
        }
   
        const gruposClientes: grupoClientePageResponseDTO[] = data.map(padres => ({
            idGrupo: padres.id_grupo,
            nombreColegio: padres.grupos[0].colegios[0].nombre,
            nivel: padres.grupos[0].nivel,
            padreResponsableNombre: padres.nombre,
            padreResponsableApellido: padres.apellido
        }));

        return gruposClientes;
    }
}
