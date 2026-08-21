import { Injectable, Inject } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { GuardarUsuarioDTO } from './dto/guardarUsuario.dto';
import { InternalServerErrorException } from '@nestjs/common';
import { UsuarioResponseDTO } from './dto/UsuarioResponse.dto';
import { UsuarioSupabaseDTO } from './dto/UsuarioSupabase.dto';
import { UsuarioResponseNombreRolDTO } from './dto/UsuarioResponseNombreRol';

@Injectable()
export class UsuariosService {
    constructor(private sb: SupabaseService){}

    async guardarUsuario(dto: GuardarUsuarioDTO)
    {
        const resultado = await this.sb.supabase
            .from('usuarios')
            .insert(dto);

        return resultado;
    }

    async obtenerUsuarioPorIdAuth(idAuth: string)
    {
        const { data, error } = await this.sb.supabase
            .from('usuarios')
            .select('id, nombre, apellido, rol')
            .eq('id_auth', idAuth)
            .single();

        if(error)
        {
            throw new InternalServerErrorException('No se pudo obtener el usuario');
        }

        return data;
    }

    async obtenerUsuarioPorId(id: number):Promise<UsuarioResponseDTO>
    {
        const { data, error } = await this.sb.supabase
        .from('usuarios')
        .select(`*`)
        .eq('id', id)
        .single();

        if(error)
        {
            throw new InternalServerErrorException('No se pudo obtener el usuario');
        }
        return data as UsuarioResponseDTO;
    }

    async obtenerUsuarios():Promise<UsuarioResponseNombreRolDTO[]>
    {
        const { data, error } = await this.sb.supabase
            .from('usuarios')
            .select(`
                id,
                id_auth,
                nombre,
                apellido,
                aprobado,
                roles (
                    nombre_rol
                )
            `)
            .returns<UsuarioSupabaseDTO[]>();

        if (error) {
            throw new Error(error.message);
        }

        return data.map(u => ({
            id: u.id,
            idAuth: u.idAuth,
            nombre: u.nombre,
            apellido: u.apellido,
            aprobado: u.aprobado,
            rol: u.roles.nombre_rol
        }));
    }

    async eliminarUsuario(id: number)
    {
        const { data: data_usuario, error: errorSelect } = await this.sb.supabase
            .from('usuarios')
            .select('id_auth')
            .eq('id', id)
            .single()

        if (errorSelect || !data_usuario) 
        {
            throw new InternalServerErrorException('No se pudo encontrar el usuario');
        }

        const { error: errorDelete } = await this.sb.supabase
            .from('usuarios')
            .delete()
            .eq('id', id);

        if (errorDelete) 
        {
            throw new InternalServerErrorException('No se pudo eliminar el usuario');
        }

        const { data, error: errorAuth } = await this.sb.supabase.auth.admin.deleteUser(data_usuario.id_auth);

        if (errorAuth) 
        {
            throw new InternalServerErrorException('No se pudo eliminar la cuenta');
        }

        return data;
    }

    async modificarAprobado(id: number, aprobado:boolean)
    {
        const { data, error } = await this.sb.supabase
        .from('usuarios')
        .update({ aprobado })
        .eq('id', id)
        .select()
        .single();

        if (error) 
        {
            console.log(error);
            throw new InternalServerErrorException('No se pudo actualizar el usuario');
        }

        return data;
    }
}