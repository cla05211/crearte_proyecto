import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { GrupoDTO } from './dto/grupo.dto';
import { BadRequestException } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { grupoClientePageResponseDTO } from './dto/grupoClientePage.dto copy';
import { grupoDatosClienteResponse } from './dto/grupoClienteDatosPage.dto';
import { AuthService } from 'src/auth/auth.service';

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

    async traerGruposClientePage(rangoDesde: number, rangoHasta:number, esFabrica:boolean, busqueda?:string):Promise<grupoClientePageResponseDTO[]>
    {
        let query = this.sb.supabase
        .from("grupos")
        .select(`id,nivel,created_at,colegios!inner (nombre, localidad, provincia, zona_sur),padres_responsables!inner (nombre, apellido, id_grupo, principal), pedidos!inner(nro_fabrica)`)
        .eq('padres_responsables.principal', true)
        .order('created_at', { ascending: false });

        if(busqueda)
        {
            query = query.ilike('colegios.nombre', `%${busqueda}%`);
        }
        if(esFabrica)
        {
            query = query.not('pedidos.nro_fabrica', 'is', null);
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
                colegio: {nombre:grupo.colegios.nombre, localidad: grupo.colegios.localidad, provincia: grupo.colegios.provincia, zona_sur: grupo.colegios.zona_sur},
                nroFabrica:grupo.pedidos[0].nro_fabrica,
                nivel: grupo.nivel!,
                padreResponsableNombre:grupo.padres_responsables[0].nombre ?? '',
                padreResponsableApellido:grupo.padres_responsables[0].apellido ?? ''
            }))
        return gruposClientes;
    }

    async traerCantidadEgresados(idGrupo: number)
    {
        const { data, error } = await this.sb.supabase
        .from("grupos")
        .select(`cantidad_egresados`)
        .eq('id', idGrupo)
        .single();

        if (error) throw new Error(error.message);

        return data?.cantidad_egresados;
    }

    async traerDatosGrupoClientePage(idGrupo:number):Promise<grupoDatosClienteResponse>
    {
        const { data: grupo, error: errGrupo } = await this.sb.supabase
            .from("grupos")
            .select(`*, colegios!inner (nombre, localidad, provincia, zona_sur)`)
            .eq('id', idGrupo)
            .single();

        if (errGrupo) throw new Error(errGrupo.message);

        const { data: padresResponsables, error: errPadres } = await this.sb.supabase
            .from("padres_responsables")
            .select('*')
            .eq('id_grupo', idGrupo)
            .order('id', { ascending: true });

        if (errPadres) throw new Error(errPadres.message);

        const { data: alumnosResponsables, error: errAlumnos } = await this.sb.supabase
            .from("alumnos_responsables")
            .select('*')
            .eq('id_grupo', idGrupo);

        if (errAlumnos) throw new Error(errAlumnos.message);

        // Usuario del portal de clientes (la contraseña no se devuelve nunca)
        const { data: cliente, error: errCliente } = await this.sb.supabase
            .from("clientes")
            .select('usuario')
            .eq('id_grupo', idGrupo)
            .maybeSingle();

        if (errCliente) throw new Error(errCliente.message);

        return {
            grupo: {
            id_colegio: grupo.id_colegio,
            orientacion: grupo.orientacion,
            turno: grupo.turno,
            nivel: grupo.nivel,
            promo: grupo.promo,
            cantidad_egresados: grupo.cantidad_egresados,
            colegio: {nombre: grupo.colegios.nombre, localidad: grupo.colegios.localidad, provincia: grupo.colegios.provincia, zona_sur: grupo.colegios.zona_sur}
            },
            padresResponsables,
            alumnosResponsables,
            usuario: cliente?.usuario.trim() ?? null
        };

    }

    async determinarSecundaria(idGrupo: number):Promise<boolean>
    {
        let secundaria = false;

        const {data, error} = await this.sb.supabase
            .from("grupos")
            .select(`nivel`)
            .eq('id', idGrupo)
            .single();
        
        if (data?.nivel == "Secundaria")
        {
            secundaria = true;
        }

        return secundaria;
    }

    // Marca el contrato del grupo como firmado (lo usa el recordatorio de contrato para cancelarse).
    async marcarContratoFirmado(idGrupo: number, fechaFirma: string)
    {
        const { data: existente, error: errorBusqueda } = await this.sb.supabase
            .from('contratos')
            .select('id')
            .eq('grupo', idGrupo)
            .limit(1)
            .maybeSingle();

        if (errorBusqueda) throw new BadRequestException(errorBusqueda.message);

        const { error } = existente
            ? await this.sb.supabase.from('contratos').update({ firmado: true, fecha_firma: fechaFirma }).eq('id', existente.id)
            : await this.sb.supabase.from('contratos').insert({ grupo: idGrupo, firmado: true, fecha_firma: fechaFirma });

        if (error) throw new BadRequestException(error.message);
    }
}
