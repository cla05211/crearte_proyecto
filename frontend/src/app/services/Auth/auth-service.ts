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

@Injectable({
  providedIn: 'root',
})
export class AuthService 
{
  http = inject(HttpClient);
  permisosService = inject(PermisosService);
  session?: Session;
  usuario?: Usuario;

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
        this.session = respuesta.session;

        this.permisosService.guardarPermisos(respuesta.permisos);
        this.guardarSesion();
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
    localStorage.setItem('permisos', JSON.stringify(this.permisos));
    }
    catch(err)
    {
      console.log(err);
    }
  }
}
