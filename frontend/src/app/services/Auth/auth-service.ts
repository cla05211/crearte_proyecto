import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { RegistroDto } from './dto/registro.interface';
import { Usuario } from '../../../interfaces/usuario';
import { Session } from '@supabase/supabase-js';
import { Permiso } from '../../../interfaces/permiso';
import { tap, throwError } from 'rxjs';
import { respuestaLogin } from './dto/respuestaLogin';
import { PermisosService } from '../permisos/permisos';
import { Router, RouterLink } from '@angular/router';
import { UsuarioRespuestaGet } from '../usuarios/dto/usuarioRespuestaGet';

@Injectable({
  providedIn: 'root',
})
export class AuthService 
{
  http = inject(HttpClient);
  permisosService = inject(PermisosService);
  router = inject(Router);
  session?: Session;
  usuario?: Usuario;

  constructor()
  {
    this.cargarUsuarioDesdeStorage();
  }

  login(correo: string, contraseña:string)
  {
    return this.http
    .post<respuestaLogin>(`${environment.apiUrl}/auth/login`, {
      correo,
      contraseña
    })
    .pipe(
      tap(respuesta => {
          console.log("Respuesta completa:", respuesta);
        this.usuario = respuesta.usuario;
        this.session = respuesta.session;

        this.permisosService.guardarPermisos(respuesta.permisos);
        this.guardarSesion();
        console.log(localStorage.getItem('permisos'))
      })
    );
  }

  registrar(dto: RegistroDto)
  {
    return this.http.post((`${environment.apiUrl}/auth/registro`), dto)
  }

  guardarSesion()
  {
    try
    {
    localStorage.setItem('access_token', this.session!.access_token);
    localStorage.setItem('token_refresh', this.session!.refresh_token);
    localStorage.setItem('usuario', JSON.stringify(this.usuario));
    }
    catch(err)
    {
      console.log(err);
    }
  }

  cerrarSesion()
  {
    return this.http
    .post(`${environment.apiUrl}/auth/salir`, {})
    .pipe(
      tap(() => {
        this.permisosService.limpiar();
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_refresh');
        localStorage.removeItem('usuario');

        this.router.navigate(['/login']);})
    ).subscribe();
  }

  cargarUsuarioDesdeStorage(): Usuario|null
  {
    let usuarioGuardado: Usuario|null = null
    try
    {
      const usuarioString = localStorage.getItem('usuario');
      if (usuarioString)
      {
        usuarioGuardado = JSON.parse(usuarioString);
        this.usuario = usuarioGuardado!;
      }
    }
    catch(err)
    {
      console.log(err);
    }
    return usuarioGuardado
  }
  
  enviarEnlaceClave(correo:string)
  {
    return this.http.post(`${environment.apiUrl}/auth/olvido-clave/${correo}`, {});
  }

  resetearClave(clave:string, accessToken:string, refreshToken:string)
  {
    return this.http.post(`${environment.apiUrl}/auth/resetear-clave`, {clave, accessToken, refreshToken});
  }
  refrescarToken()
  {
    const refreshToken = localStorage.getItem('token_refresh');
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token'));
    }

    return this.http.post<respuestaLogin>(`${environment.apiUrl}/auth/refresh`, {
      refresh_token: refreshToken
    }).pipe(
      tap(respuesta => {
        this.session = respuesta.session;
        localStorage.setItem('access_token', this.session!.access_token);
        localStorage.setItem('token_refresh', this.session!.refresh_token);
      })
    );
  }
}
