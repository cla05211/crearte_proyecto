import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { ConfirmationService } from '../confirmation/confirmation.service';
import { UsuarioRespuestaGet } from './dto/usuarioRespuestaGet';
import { RegistroDto } from '../Auth/dto/registro.interface';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService 
{
  http = inject(HttpClient);

  modificarAprobadoUsuario(id:number, aprobado:boolean)
  {
    return this.http.post(`${environment.apiUrl}/usuarios/aprobacion`, {id: id, aprobado: aprobado});
  }

  eliminarUsuario(idUsuario: number)
  {
    return this.http.delete(`${environment.apiUrl}/usuarios/${idUsuario}`);
  }

  traerUsuarios()
  {
    return this.http.get<UsuarioRespuestaGet[]>(`${environment.apiUrl}/usuarios`);
  }
}
