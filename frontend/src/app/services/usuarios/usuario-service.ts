import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { ConfirmationService } from '../confirmation/confirmation.service';
import { UsuarioResponse } from './dto/usuarioResponse';
import { RegistroDto } from '../Auth/dto/registro.interface';
import { UsuarioResponseConNombreRol } from './dto/usuarioResponseNombreRol';

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
    return this.http.get<UsuarioResponseConNombreRol[]>(`${environment.apiUrl}/usuarios`);
  }

  traerUsuarioPorId(idUsuario: number)
  {
    return this.http.get<UsuarioResponse>(`${environment.apiUrl}/usuarios/${idUsuario}`);
  }
}
