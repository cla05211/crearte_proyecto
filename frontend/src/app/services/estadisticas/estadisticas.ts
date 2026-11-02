import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { EstadisticasVentasDTO } from './dto/estadisticasVentas.dto';

@Injectable({
  providedIn: 'root',
})
export class Estadisticas 
{
    private readonly http = inject(HttpClient);

    obtenerEstadisticasVentas()
    {
        return this.http.get<EstadisticasVentasDTO[]>(`${environment.apiUrl}/estadisticas/ventas`);
    }
}
