import { Injectable, Inject } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { GuardarUsuarioDTO } from './dto/guardarUsuario.dto';
import { InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class UsuariosService {
    constructor(private sb: SupabaseService){}

    async guardarUsuario(dto: GuardarUsuarioDTO)
    {
        console.log('DTO recibido:', dto);
        const resultado = await this.sb.supabase
            .from('usuarios')
            .insert(dto);

        console.log('Resultado Supabase:', resultado);

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
}
