import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { SubirArchivoStorage } from './dtos/SubirArchivoStorage';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StorageService 
{

  http = inject(HttpClient);

  subirImagen(datos: SubirArchivoStorage): Observable<string>
  {
    const formData = new FormData();
    formData.append('nombreArchivo', datos.nombreArchivo);
    formData.append('carpetaGuardado', datos.carpetaGuardado);
    formData.append('archivo', datos.archivo, datos.archivo.name);

    return this.http.post<string>(`${environment.apiUrl}/storage`, formData)
  }
}
