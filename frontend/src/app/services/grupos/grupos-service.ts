import { environment } from '../../../environments/environment.development';
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

    obtenerGruposClientes(rangoDesde:number, rangoHasta:number, busqueda?: string): Observable<grupoClientePageResponseDTO[]>
    {
      let params: any = {rangoDesde, rangoHasta};
  
      if (busqueda !== undefined)
      {
        params.busqueda = busqueda;
      }
  
      return this.http.get<grupoClientePageResponseDTO[]>(`${environment.apiUrl}/grupos/clientes-page`, {params});
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
 