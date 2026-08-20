import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class DocumentosService 
{
  http = inject(HttpClient);

  obtenerUrlArchivo(idDocumento: number): Observable<{url:string}>
  {
    return (this.http.get<{url:string}>(`${environment.apiUrl}/documentos/${idDocumento}`));
  }
}
