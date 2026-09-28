import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MuestrasTablaDTO } from './dto/muestrasTabla.dto';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MuestasFisicas 
{
    http = inject(HttpClient);  

    traerMuestrasTabla(): Observable<MuestrasTablaDTO[]>
    {
        return this.http.get<MuestrasTablaDTO[]>(`${environment.apiUrl}/muestras-fisicas`);
    }
    
    modificarMuestras(idMuestra: number, muestras: string): Observable<void>
    {
        return this.http.patch<void>(`${environment.apiUrl}/muestras-fisicas/muestras/${idMuestra}`, null, { params: { muestras } });
    }

    modificarEstado(idMuestra: number, estado: string): Observable<void>
    {
        return this.http.patch<void>(`${environment.apiUrl}/muestras-fisicas/estado/${idMuestra}`, null, { params: { estado } });
    }

    modificarFechaEntrega(idMuestra: number, fechaEntrega: string): Observable<void>
    {
        return this.http.patch<void>(`${environment.apiUrl}/muestras-fisicas/fecha-entrega/${idMuestra}`, null, { params: { fechaEntrega } });
    }

    modificarFechaDevolucion(idMuestra: number, fechaDevolucion: string): Observable<void>
    {
        return this.http.patch<void>(`${environment.apiUrl}/muestras-fisicas/fecha-devolucion/${idMuestra}`, null, { params: { fechaDevolucion } });
    }

    modificarEnvio(idMuestra: number, envio: boolean): Observable<void>
    {
        return this.http.patch<void>(`${environment.apiUrl}/muestras-fisicas/envio/${idMuestra}`, null, { params: { envio } });
    }
}
