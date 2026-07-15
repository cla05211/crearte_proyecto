import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { RegistroDto } from './dto/registro.interface';
import { Usuario } from '../../../interfaces/usuario';
import { Session } from '@supabase/supabase-js';
import { Permiso } from '../../../interfaces/permiso';
import { tap } from 'rxjs';
import { respuestaLogin } from './dto/respuestaLogin';

@Injectable({
  providedIn: 'root',
})
export class AuthService 
{
  http = inject(HttpClient);
  session?: Session;
  usuario?: Usuario;
  permisos: Permiso[] = [];

  login(correo: string, contraseña:string)
  {
    return this.http
    .post<respuestaLogin>(`${environment.apiUrl}/auth/login`, {
      correo,
      contraseña
    })
    .pipe(
      tap(respuesta => {
        this.usuario = respuesta.usuario;
        this.permisos = respuesta.permisos;
        this.session = respuesta.session;

        this.guardarSesion(respuesta.session);
      })
    );
  }


  registrar(dto: RegistroDto)
  {
    return this.http.post((`${environment.apiUrl}/auth/registro`), dto)
  }

  guardarSesion(sesion:any)
  {
    localStorage.setItem('access_token', sesion.access_token);
    localStorage.setItem('token_refresh', sesion.refresh_token);
  }
}
