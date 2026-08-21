import { environment } from '../../../environments/environment.development';
import { inject, Injectable } from '@angular/core';
import { MovimientoCajaResponseDTO } from './dto/movimientoCajaResponse.dto';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MovimientoCajaDTO } from './dto/movimientoCaja.dto copy';

@Injectable({
  providedIn: 'root',
})
export class MovimientosCajaService 
{
  http = inject(HttpClient);  

  agregarMovimiento(dto:MovimientoCajaDTO):Observable<number>
  {
    return this.http.post<number>(`${environment.apiUrl}/movimientos-caja`,dto);
  }

  obtenerMovimientos(rangoDesde:number, rangoHasta:number, busqueda?: string): Observable<MovimientoCajaResponseDTO[]>
  {
    let params: any = {rangoDesde, rangoHasta};

    if (busqueda !== undefined) 
    {
      params.busqueda = busqueda;
    }

    return this.http.get<MovimientoCajaResponseDTO[]>(`${environment.apiUrl}/gestion-pedidos`, {params});
  }

  obtenerTotalIngresos()
  {
    return this.http.get<number>(`${environment.apiUrl}/pagos/movimientos-caja/ingresos`);
  }

  obtenerTotalEgresos()
  {
    return this.http.get<number>(`${environment.apiUrl}/pagos/movimientos-caja/egresos`);
  }

  eliminarMovimiento(id:number)
  {
    return this.http.delete(`${environment.apiUrl}/movimientos-caja/${id}`);
  }
}
