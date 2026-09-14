import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-clientes-auth-service',
  imports: [],
  templateUrl: './clientes-auth-service.html',
  styleUrl: './clientes-auth-service.css',
})
export class ClientesAuthService 
{
  http = inject(HttpClient);  

  iniciarSesion(usuarioNombre:string, contrasena: string)
  {
    return this.http.get(`${environment.apiUrl}/'clientes-auth'`,{params:{usuarioNombre,contrasena}});
  }
}
