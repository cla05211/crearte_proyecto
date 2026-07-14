import { Injectable, Inject } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { RegistroDto } from './dto/registro.dto';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { GuardarUsuarioDTO } from 'src/usuarios/dto/guardarUsuario.dto';

@Injectable()
export class AuthService {
  constructor(private sb: SupabaseService, private usuarioService: UsuariosService) {}

  async registrar(dto: RegistroDto) 
  {
    var auth_id = await this.guardarAuth(dto);
    console.log(this.sb.supabase);

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
     if(error || !data.user)
      {
         throw error ?? new Error('No se pudo crear el usuario');
      }
    else
      {
        return data.user.id;
      }
  }

  async iniciarSesion(correo: string, contraseña: string) {
    return await this.sb.supabase.auth.signInWithPassword({ email: correo, password: contraseña });
  }

  async guardarUsuario(nombre:string, apellido:string, rol:string)
  {
    return await this.sb.supabase.from("usuarios").insert({nombre, apellido, rol})
  }

}