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
    
    modificarMuestras(idMuestra:number, muestras:string)
    {
        this.http.patch((`${environment.apiUrl}/muestras-fisicas/muestras/${idMuestra}`), muestras);
    }
    
    modificarEstado(idMuestra:number, estado:string)
    {
        this.http.patch((`${environment.apiUrl}/muestras-fisicas/muestras/${idMuestra}`), estado);
    }

    modificarFechaEntrega(idMuestra:number, fechaEntrega:string)
    {
        this.http.patch((`${environment.apiUrl}/muestras-fisicas/fecha-entrega/${idMuestra}`), fechaEntrega);
    }

    modificarFechaDevolucion(idMuestra:number, fecheDevolucion:string)
    {
        this.http.patch((`${environment.apiUrl}/muestras-fisicas/fecha-devolucion/${idMuestra}`), fecheDevolucion);
    }
}
