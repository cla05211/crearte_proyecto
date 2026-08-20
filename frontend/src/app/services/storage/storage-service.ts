import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { SubirArchivoStorage } from './dtos/SubirArchivoStorage';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StorageService 
{
  http = inject(HttpClient);

  subirImagen(datos: SubirArchivoStorage): Observable<{ruta: string}>
  {
    const formData = new FormData();
    formData.append('nombreArchivo', datos.nombreArchivo);
    formData.append('carpetaGuardado', datos.carpetaGuardado);
    formData.append('archivo', datos.archivo, datos.archivo.name);

    return this.http.post<{ruta: string}>(`${environment.apiUrl}/storage`, formData)
  }

  obtenerUrlArchivo(ruta: string): Observable<{url:string}>
  {
    return this.http.get<{url:string}>(`${environment.apiUrl}/storage/`,{params:{ruta}});
  }

  async descargarImagen(nombreArchivo: string, ruta:string) 
  {
    const url = (await firstValueFrom(this.obtenerUrlArchivo(ruta))).url;
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = nombreArchivo;
    link.click();

    URL.revokeObjectURL(objectUrl);
  }
}
