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

  obtenerMovimientos(rangoDesde:number, rangoHasta:number, busqueda?: string, tipo?:string, categoria?:string): Observable<MovimientoCajaResponseDTO[]>
  {
    let params: any = {rangoDesde, rangoHasta};

    if (busqueda !== undefined)
    {
      params.busqueda = busqueda;
    }

    if (tipo !== undefined)
    {
      params.tipo = tipo;
    }

    if (categoria !== undefined)
    {
      params.categoria = categoria;
    }

    return this.http.get<MovimientoCajaResponseDTO[]>(`${environment.apiUrl}/movimientos-caja`, {params});
  }

  obtenerTotalIngresos():Observable<number>
  {
    return this.http.get<number>(`${environment.apiUrl}/movimientos-caja/ingresos`);
  }

  obtenerTotalEgresos():Observable<number>
  {
    return this.http.get<number>(`${environment.apiUrl}/movimientos-caja/egresos`);
  }

  modificarMovimiento(id:number, nuevoMovimiento: MovimientoCajaDTO)
  {
    return this.http.patch(`${environment.apiUrl}/movimientos-caja/${id}`, nuevoMovimiento);
  }

  eliminarMovimiento(id:number)
  {
    return this.http.delete(`${environment.apiUrl}/movimientos-caja/${id}`);
  }
}
