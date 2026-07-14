import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RolDto } from './dto/rol.dto';

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
}
