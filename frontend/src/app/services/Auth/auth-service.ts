import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { RegistroDto } from './dto/registro.interface';
import { Usuario } from '../../../interfaces/usuario';
import { Session } from '@supabase/supabase-js';
import { Permiso } from '../../../interfaces/permiso';
import { tap } from 'rxjs';
import { respuestaLogin } from './dto/respuestaLogin';
import { PermisosService } from '../permisos/permisos';
import { Router, RouterLink } from '@angular/router';

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
    console.log(localStorage.getItem('usuario'))
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

        this.router.navigate(['/login']);})
    );
  }

  cargarUsuarioDesdeStorage(): void
  {
    try
    {
      const usuarioGuardado = localStorage.getItem('usuario');
      if (usuarioGuardado)
      {
        this.usuario = JSON.parse(usuarioGuardado);
      }
    }
    catch(err)
    {
      console.log(err);
    }
  }
  
  resetearContraseña(correo:string)
  {
    return this.http.post(`${environment.apiUrl}/auth/contraseña/${correo}`, {});
  }

}
