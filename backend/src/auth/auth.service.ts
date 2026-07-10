import { Injectable, Inject } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class AuthService {
    usuarioActual: User | null = null;
    sesionIniciada = new BehaviorSubject<boolean>(false);
    sesionIniciadaObservable = this.sesionIniciada.asObservable();

  constructor(private sb: SupabaseService) 
  {
    sb.supabase.auth.onAuthStateChange((event, session)=>
        {
            console.log(event,session);
            if(session)
            {
                this.usuarioActual = session.user
                this.sesionIniciada.next(true);
            }
            else
            {
                this.usuarioActual = null
                this.sesionIniciada.next(false);
            }
        })
   }

  //Crear cuenta
  async CrearCuenta(correo:string, contraseña:string)
    {
        return await this.sb.supabase.auth.signUp({email:correo, password:contraseña});
    }
  //Iniciar Sesion
  async IniciarSesion(correo:string, contraseña:string)
    {
    return await this.sb.supabase.auth.signInWithPassword({email:correo, password:contraseña});
    }
  //Cerrar Sesion
  async CerrarSesion()
  {
  const {error} = await this.sb.supabase.auth.signOut({});
  }
  //Saber si hay usuario logueado
}

