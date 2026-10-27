import { environment } from '../../../environments/environment';
import { Injectable, inject } from '@angular/core';
import { grupoClientePageResponseDTO } from './dtos/grupoClientePage.dto copy';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { grupoClienteDatosPageResponse } from './dtos/grupoClienteDatosPage.dto';

@Injectable({
  providedIn: 'root',
})
export class GruposService 
{
    http = inject(HttpClient);  

    // mes / anio: período por fecha de venta (sin anio = todos; anio sin mes = el año entero)
    obtenerGruposClientes(rangoDesde:number, rangoHasta:number, busqueda?: string, mes?: number | null, anio?: number | null): Observable<grupoClientePageResponseDTO[]>
    {
      const params = { rangoDesde, rangoHasta, ...this.parametrosFiltroClientes(busqueda, mes, anio) };
      return this.http.get<grupoClientePageResponseDTO[]>(`${environment.apiUrl}/grupos/clientes-page`, {params});
    }

    contarGruposClientes(busqueda?: string, mes?: number | null, anio?: number | null): Observable<number>
    {
      return this.http.get<number>(`${environment.apiUrl}/grupos/clientes-page/cantidad`, {params: this.parametrosFiltroClientes(busqueda, mes, anio)});
    }

    private parametrosFiltroClientes(busqueda?: string, mes?: number | null, anio?: number | null): Record<string, string | number>
    {
      const params: Record<string, string | number> = {};
      if (busqueda) params['busqueda'] = busqueda;
      if (anio) params['anio'] = anio;
      if (anio && mes) params['mes'] = mes;
      return params;
    }

    obtenerDatosGruposClientes(idGrupo:number): Observable<grupoClienteDatosPageResponse>
    {
      return this.http.get<grupoClienteDatosPageResponse>(`${environment.apiUrl}/grupos/clientes-page/datos/${idGrupo}`);
    }

    obtenerCantidadEgresados(idGrupo: number): Observable<number>
    {
      return this.http.get<number>(`${environment.apiUrl}/grupos/egresados/${idGrupo}`);
    }
}
 