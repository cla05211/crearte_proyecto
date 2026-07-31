import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RolDto } from './dto/rol.dto';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RolService 
{
  constructor(private http: HttpClient) {}

  obtenerRoles()
  {
    return this.http.get<RolDto[]>('http://localhost:3000/roles');
  }

  obtenerNombreRolPorNumero(nroRol: number): Observable<{ nombre_rol: string }>
  {
    return this.http.get<{nombre_rol: string }>(`http://localhost:3000/roles/nro/${nroRol}`);
  }
}
