import { Injectable, Inject } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { RegistroDto } from './dto/registro.dto';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { GuardarUsuarioDTO } from 'src/usuarios/dto/guardarUsuario.dto';
import { UnauthorizedException } from '@nestjs/common';
import { ConflictException, BadRequestException, HttpException } from '@nestjs/common';
import { PermisosService } from 'src/permisos/permisos.service';

@Injectable()
export class AuthService {
  constructor(private sb: SupabaseService, private usuarioService: UsuariosService, private permisosService: PermisosService) {}

  async registrar(dto: RegistroDto) 
  {
    var auth_id = await this.guardarAuth(dto);

    const usuarioDto: GuardarUsuarioDTO = {
    nombre: dto.nombre,
    apellido: dto.apellido,
    rol: dto.rol,
    id_auth: auth_id,
    };
    
    return await this.usuarioService.guardarUsuario(usuarioDto)
  }

    async guardarAuth(dto: RegistroDto): Promise<string>
    {
        const {data, error} = await this.sb.supabase.auth.admin.createUser({ email: dto.correo, password: dto.contraseña, email_confirm: true, });
        if(error)
        {
            console.log (error)
            switch (error.code) 
            {
                case 'user_already_exists':
                    throw new ConflictException({
                        code: 'USER_ALREADY_EXISTS',
                        message: 'Ya existe una cuenta registrada con ese correo.',
                    });
                default:
                    throw new BadRequestException({
                        code: 'SIGNUP_ERROR',
                        message: error.message,
                    });
            }
        }

        return data.user.id;
    }

  async iniciarSesion(correo: string, contraseña: string) 
  {
    const{data,error} = await this.sb.supabase.auth.signInWithPassword({ email: correo, password: contraseña });
    if (error) 
    {
        throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: error.message,
        });
    }

    const aprobado = await this.comprobarAprobado(data.user.id)

    if(!aprobado)
    {
        this.sb.supabase.auth.signOut();
        throw new UnauthorizedException({
        code: 'PENDING_APPROVAL',
        message: 'Usuario pendiente de aprobación.',
        });
    }
    
    const usuario = await this.usuarioService.obtenerUsuarioPorIdAuth(data.user.id);
    const permisos = await this.obtenerPermisos(usuario.rol);

    return {session: data.session, usuario, permisos};
  }

  async obtenerPermisos(rol:number)
  {
    return this.permisosService.obtenerPermisosRol(rol);
  }

  async comprobarAprobado(authId: string):Promise <boolean>
  { 
    const {data,error} = await this.sb.supabase.from("usuarios").select('aprobado').eq('id_auth', authId).single();

    if(error)
    {
        throw error;
    }
    
    return data.aprobado;
  }

    async guardarUsuario(nombre:string, apellido:string, rol:string)
  {
    return await this.sb.supabase.from("usuarios").insert({nombre, apellido, rol})
  }


}