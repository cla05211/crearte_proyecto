import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { UsuarioRespuestaGet } from './dto/usuarioRespuestaGet';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService 
{
  http = inject(HttpClient)

  aprobarUsuario()
  {

  }

  eliminarUsuario()
  {
    
  }

  traerUsuarios()
  {
    return this.http.get<UsuarioRespuestaGet[]>(`${environment.apiUrl}/usuarios`);
  }
}
