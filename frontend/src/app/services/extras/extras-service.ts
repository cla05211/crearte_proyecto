import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// Archivos internos de Talles y diseño (capturas, PDFs de resguardo). Solo empleados: el cliente no los ve.
export interface ExtraDTO
{
    id: number;
    nombre: string;
    formato: 'pdf' | 'imagen';
    created_at: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ExtrasService
{
    private readonly http = inject(HttpClient);

    listar(idGrupo: number)
    {
        return this.http.get<ExtraDTO[]>(`${environment.apiUrl}/extras/${idGrupo}`);
    }

    pedirUrlSubida(idGrupo: number, archivo: File)
    {
        return this.http.post<{ ruta: string; signedUrl: string }>(
            `${environment.apiUrl}/extras/url-subida`, { idGrupo, nombreArchivo: archivo.name, tipoArchivo: archivo.type });
    }

    // PUT directo a Supabase con la URL firmada (no pasa por Nest), emitiendo el progreso
    subirArchivoAUrlFirmada(signedUrl: string, archivo: File)
    {
        return this.http.put(signedUrl, archivo, {
            headers: { 'Content-Type': archivo.type },
            reportProgress: true,
            observe: 'events',
        });
    }

    confirmar(idGrupo: number, ruta: string)
    {
        return this.http.post<{ idDocumento: number }>(`${environment.apiUrl}/extras/confirmar`, { idGrupo, ruta });
    }

    obtenerUrlDescarga(idGrupo: number, idDocumento: number)
    {
        return this.http.get<{ url: string }>(`${environment.apiUrl}/extras/${idGrupo}/${idDocumento}/url-descarga`);
    }

    eliminar(idGrupo: number, idDocumento: number)
    {
        return this.http.delete<{ idDocumento: number }>(`${environment.apiUrl}/extras/${idGrupo}/${idDocumento}`);
    }
}
