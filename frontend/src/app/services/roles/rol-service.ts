import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RolDto } from './dto/rol.dto';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RolService 
{
  constructor(private http: HttpClient) {}

  obtenerRoles()
  {
    return this.http.get<RolDto[]>(`${environment.apiUrl}/roles`);
  }

  obtenerNombreRolPorNumero(nroRol: number): Observable<{ nombre_rol: string }>
  {
    return this.http.get<{nombre_rol: string }>(`${environment.apiUrl}/roles/nro/${nroRol}`);
  }
}
