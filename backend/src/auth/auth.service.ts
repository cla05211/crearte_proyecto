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
import { ConfigService } from '@nestjs/config';
import { ResetearClaveDto } from './dto/resetearClave.dto';

@Injectable()
export class AuthService {
  constructor(private sb: SupabaseService, private usuarioService: UsuariosService, private permisosService: PermisosService, private configService: ConfigService) {}

  // Roles que no se pueden elegir al registrarse (igual que el filtro del front)
  private static readonly ROLES_NO_REGISTRABLES = ['Administrador', 'Cliente'];

  async registrar(dto: RegistroDto) 
  {
    await this.validarRolRegistrable(dto.rol);

    const auth_id = await this.guardarAuth(dto);

    const usuarioDto: GuardarUsuarioDTO = {
    nombre: dto.nombre,
    apellido: dto.apellido,
    rol: dto.rol,
    id_auth: auth_id,
    aprobado: false, // Toda cuenta nueva queda pendiente hasta que un administrador la apruebe
    };

    try
    {
      return await this.usuarioService.guardarUsuario(usuarioDto);
    }
    catch (error)
    {
      // Si no se pudo crear la fila en usuarios, se borra la cuenta de Auth para que pueda volver a registrarse
      await this.sb.supabase.auth.admin.deleteUser(auth_id);
      throw error;
    }
  }

  private async validarRolRegistrable(rol: number)
  {
    const { data, error } = await this.sb.supabase
      .from('roles')
      .select('nombre_rol')
      .eq('rol', rol)
      .maybeSingle();

    if (error || !data || AuthService.ROLES_NO_REGISTRABLES.includes(data.nombre_rol ?? ''))
    {
      throw new BadRequestException({ code: 'ROL_INVALIDO', message: 'El rol seleccionado no es válido.' });
    }
  }

    async guardarAuth(dto: RegistroDto): Promise<string>
    {
        const {data, error} = await this.sb.supabase.auth.admin.createUser({ email: dto.correo, password: dto.contraseña, email_confirm: true, });
        if(error)
        {
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
    const{data,error} = await this.sb.supabaseAuth.auth.signInWithPassword({ email: correo, password: contraseña });
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
        await this.revocarSesion(data.session.access_token);
        throw new UnauthorizedException({
        code: 'PENDING_APPROVAL',
        message: 'Usuario pendiente de aprobación.',
        });
    }
    
    const usuario = await this.usuarioService.obtenerUsuarioPorIdAuth(data.user.id);
    const permisos = await this.permisosService.obtenerPermisosRol(usuario.rol!);

    return {session: data.session, usuario, permisos};
  }

  // Revoca los refresh tokens del usuario en Supabase: después de esto el token actual sigue
  // sirviendo hasta que vence (1 h), pero ya no se puede refrescar.
  async cerrarSesion(accessToken?: string)
  {
    if (accessToken)
    {
      await this.revocarSesion(accessToken);
    }
  }

  private async revocarSesion(accessToken: string)
  {
    // Si el token ya está vencido Supabase devuelve error: no importa, el usuario igual queda afuera
    await this.sb.supabase.auth.admin.signOut(accessToken).catch(() => undefined);
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

  async enviarEnlaceClave(correo:string)
  {
    const redirigir = `${this.configService.getOrThrow<string>('FRONTEND_URL')}/resetear-clave`;
    const { error } = await this.sb.supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: redirigir,
    });

    if (error) 
    {
      throw new BadRequestException(error.message);
    }

    return {mensaje: 'Se ha enviado un enlace para restablecer la contraseña al correo ingresado'};
  }

  async resetearClave(dto:ResetearClaveDto)
  {
    // Se valida el token del link del mail sin guardar la sesión en el cliente compartido del backend
    // (setSession sobre this.sb.supabase hacía que TODAS las consultas pasaran a usar el token de esta persona).
    const { data, error: errorUsuario } = await this.sb.supabase.auth.getUser(dto.accessToken);

    if(errorUsuario || !data.user)
    {
      throw new BadRequestException(errorUsuario?.message ?? 'El enlace no es válido o expiró');
    }

    const { error } = await this.sb.supabase.auth.admin.updateUserById(data.user.id, {
      password: dto.clave
    });

    if(error)
    {
      throw new BadRequestException(error.message);
    }

    return { mensaje: 'Contraseña restablecida'};
  }
  
  async refrescarSesion(refreshToken: string) {
  const { data, error } = await this.sb.supabaseAuth.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session) {
    throw new UnauthorizedException('No se pudo refrescar la sesión');
  }

  // Un usuario desaprobado (o desactivado) no puede seguir renovando su sesión
  const aprobado = await this.comprobarAprobado(data.user!.id).catch(() => false);
  if (!aprobado)
  {
    await this.revocarSesion(data.session.access_token);
    throw new UnauthorizedException({ code: 'PENDING_APPROVAL', message: 'Usuario no habilitado.' });
  }

  return {
    session: data.session,
    usuario: data.user,
  };
}
}
