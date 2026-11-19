import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SubirArchivoStorage } from './dtos/SubirArchivoStorage';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map, Observable, switchMap } from 'rxjs';

// Tipo que se declara al pedir la URL y se manda en el PUT (tienen que coincidir: el back valida el que guarda Supabase)
export function tipoArchivo(archivo: Blob): string
{
    return archivo.type || 'application/octet-stream';
}

export interface UrlSubida
{
    ruta: string;
    signedUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class StorageService 
{
    http = inject(HttpClient);

    // PUT directo a Supabase con la URL firmada (no pasa por Nest, así no choca con el límite de 4.5 MB de Vercel).
    // El interceptor de auth no le agrega el token porque la URL no es de la API.
    subirAUrlFirmada(signedUrl: string, archivo: Blob): Observable<unknown>
    {
        return this.http.put(signedUrl, archivo, { headers: { 'Content-Type': tipoArchivo(archivo) } });
    }

    // Pide la URL firmada a "urlSubida" y sube el archivo; devuelve la ruta para mandársela al back
    subirConUrl(pedirUrl: Observable<UrlSubida>, archivo: Blob): Observable<string>
    {
        return pedirUrl.pipe(
            switchMap(({ ruta, signedUrl }) => this.subirAUrlFirmada(signedUrl, archivo).pipe(map(() => ruta))),
        );
    }

    // Archivos de Ventas (comprobantes de seña y recursos adicionales)
    subirImagen(datos: SubirArchivoStorage): Observable<{ruta: string}>
    {
        const pedirUrl = this.http.post<UrlSubida>(`${environment.apiUrl}/storage/url-subida`, {
            nombreArchivo: datos.nombreArchivo,
            carpetaGuardado: datos.carpetaGuardado,
            mimetype: tipoArchivo(datos.archivo),
        });

        return this.subirConUrl(pedirUrl, datos.archivo).pipe(map((ruta) => ({ ruta })));
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
