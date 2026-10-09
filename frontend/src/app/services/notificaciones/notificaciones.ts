import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Notificaciones 
{
    http = inject(HttpClient);  

    enviarMensajeContrato(idPedido:number): Observable<string>
    {
        return this.http.post(`${environment.apiUrl}/notificaciones/contrato/${idPedido}`, null, { responseType: 'text' });
    }
}
