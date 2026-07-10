import { Injectable, Inject } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(private sb: SupabaseService) {}

  async crearCuenta(correo: string, contraseña: string) 
  {
    return await this.sb.supabase.auth.signUp({ email: correo, password: contraseña });
  }

  // Iniciar sesión -> Supabase devuelve access_token y refresh_token
  async iniciarSesion(correo: string, contraseña: string) {
    return await this.sb.supabase.auth.signInWithPassword({ email: correo, password: contraseña });
  }

  async obtenerUsuarioPorToken(token: string) {
    const { data, error } = await this.sb.supabase.auth.getUser(token);
    if (error) return null;
    return data.user;
  }
}