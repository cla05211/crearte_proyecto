import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { RegistroDto } from './dto/registro.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthService 
{
  http = inject(HttpClient);

  login(correo: string, contraseña:string)
  {
    return this.http.post((`${environment.apiUrl}/auth/login`),
		{
			correo: correo,
			contraseña: contraseña
		});
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
