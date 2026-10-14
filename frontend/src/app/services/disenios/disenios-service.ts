import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class DiseniosService
{
    private readonly http = inject(HttpClient);

    pedirUrlSubida(idGrupo: number)
    {
        return this.http.post<{ ruta: string; signedUrl: string }>(
            `${environment.apiUrl}/disenios/url-subida`, { idGrupo });
    }

    // PUT directo a Supabase con la URL firmada (no pasa por Nest).
    // observe: 'events' + reportProgress emiten el avance de la subida.
    subirArchivoAUrlFirmada(signedUrl: string, archivo: File)
    {
        return this.http.put(signedUrl, archivo, {
            headers: { 'Content-Type': 'application/pdf' },
            reportProgress: true,
            observe: 'events',
        });
    }

    confirmar(idGrupo: number, tipo: string, ruta: string)
    {
        return this.http.post<{ idDocumento: number }>(
            `${environment.apiUrl}/disenios/confirmar`, { idGrupo, tipo, ruta });
    }

    reemplazar(idGrupo: number, idDocumento: number, ruta: string)
    {
        return this.http.post<{ idDocumento: number }>(
            `${environment.apiUrl}/disenios/reemplazar`, { idGrupo, idDocumento, ruta });
    }
}
