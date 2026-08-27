import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { GrupoDTO } from './dto/grupo.dto';
import { BadRequestException } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { grupoClientePageResponseDTO } from './dto/grupoClientePage.dto copy';
import { grupoDatosClienteResponse } from './dto/grupoClienteDatosPage.dto';

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
        .from("grupos")
        .select(`id,nivel,created_at,colegios!inner (nombre),padres_responsables!inner (nombre, apellido, id_grupo, mail)`)
        .not('padres_responsables.mail', 'is', null)
        .neq('padres_responsables.mail', '')
        .order('created_at', { ascending: false });

        if(busqueda)
        {
            query = query.ilike('colegios.nombre', `%${busqueda}%`);
        }

        const { data, error } = await query.range(rangoDesde, rangoHasta);

        if (error) 
        {
            throw new Error(error.message);
        }
   
        const gruposClientes: grupoClientePageResponseDTO[] = data.filter(grupo => grupo.padres_responsables[0]?.nombre && grupo.padres_responsables[0]?.apellido)
        .map(grupo => 
            ({
                idGrupo: grupo.id!,
                nombreColegio: grupo.colegios.nombre!,
                nivel: grupo.nivel!,
                padreResponsableNombre:grupo.padres_responsables[0].nombre ?? '',
                padreResponsableApellido:grupo.padres_responsables[0].apellido ?? ''
            }))
        return gruposClientes;
    }

    async traerDatosGrupoClientePage(idGrupo:number):Promise<grupoDatosClienteResponse>
    {
        const {data,error} = await this.sb.supabase
        .from("grupos")
        .select(`*,padres_responsables!inner (*), alumnos_responsables!inner (*), colegios!inner (nombre)`)
        .eq('id', idGrupo)
        .single()

        if (error) 
        {
            throw new Error(error.message);
        }
   
        const datosCliente: grupoDatosClienteResponse =       
        {
            grupo:
            {
                id_colegio: data.id_colegio,
                orientacion: data.orientacion,
                turno: data.turno,
                nivel: data.nivel,
                promo: data.promo,
                cantidad_egresados: data.cantidad_egresados,
                nombre_colegio: data.colegios.nombre
            },
            padresResponsables:data.padres_responsables,
            alumnosResponsables: data.alumnos_responsables
        }

        return datosCliente;
    }
}
