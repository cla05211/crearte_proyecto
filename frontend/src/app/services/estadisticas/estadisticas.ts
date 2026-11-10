import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { EstadisticasVentasDTO } from './dto/estadisticasVentas.dto';
import { EstadisticasProduccionDTO } from './dto/estadisticasProduccion.dto';
import { EstadisticasBancosDTO } from './dto/estadisticasBancos.dto';
import { EstadisticasCobranzasDTO } from './dto/estadisticasCobranzas.dto';

@Injectable({
  providedIn: 'root',
})
export class Estadisticas 
{
    private readonly http = inject(HttpClient);

    obtenerEstadisticasVentas(anio: number)
    {
        return this.http.get<EstadisticasVentasDTO[]>(`${environment.apiUrl}/estadisticas/ventas`, { params: { anio } });
    }
    
    obtenerEstadisticasProduccion(anio: number)
    {
        return this.http.get<EstadisticasProduccionDTO[]>(`${environment.apiUrl}/estadisticas/produccion`, { params: { anio } });
    }

    obtenerEstadisticasBancos(anio: number)
    {
        return this.http.get<EstadisticasBancosDTO>(`${environment.apiUrl}/estadisticas/bancos`, { params: { anio } });
    }

    obtenerEstadisticasCobranzas(anio: number)
    {
        return this.http.get<EstadisticasCobranzasDTO[]>(`${environment.apiUrl}/estadisticas/cobranzas`, { params: { anio } });
    }

}
