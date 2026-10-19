import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { alumnoResponsableResponseDTO } from './dto/AlumnoResponsableResponseDTO';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class AlumnoResponsable 
{
  http = inject(HttpClient);  

  traerAlumnosResponsables(idGrupo: number): Observable<alumnoResponsableResponseDTO[]>
  {
    return this.http.get<alumnoResponsableResponseDTO[]>((`${environment.apiUrl}/alumno-responsable/${idGrupo}`));
  }

  modificarAlumnoPrincipal(idGrupo:number, idNuevoAlumnoPrincipal:number):Observable<alumnoResponsableResponseDTO>
  {
    return this.http.patch<alumnoResponsableResponseDTO>(`${environment.apiUrl}/alumno-responsable/${idGrupo}/${idNuevoAlumnoPrincipal}`,null);
  }
}
