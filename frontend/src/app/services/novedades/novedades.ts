import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { NovedadDTO } from './Novedad.dto';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Novedades {

    private readonly http = inject(HttpClient);

    obtenerNovedadesVentas()
    {
        return this.http.get<NovedadDTO[]>(`${environment.apiUrl}/novedades/ventas`);
    }

    obtenerNovedadesProduccion()
    {
        return this.http.get<NovedadDTO[]>(`${environment.apiUrl}/novedades/produccion`);
    }
    
}
