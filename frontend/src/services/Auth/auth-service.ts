import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';


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
}
