import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PedidoDTOResponse } from './dto/pedidoResponse.dto';

@Injectable({
  providedIn: 'root',
})
export class PedidosService 
{
  http = inject(HttpClient);  

  obtenerPedidoGrupo(idPedido:number):Observable<PedidoDTOResponse>
  {
    return this.http.get<PedidoDTOResponse>(`${environment.apiUrl}/pedidos/${idPedido}`);
  }

  obtenerIdVendedora(idPedido:number):Observable<number>
  {
    return this.http.get<number>(`${environment.apiUrl}/pedidos/vendedora/${idPedido}`);
  }

  obtenerIdPedidoGrupo(idGrupo:number):Observable<number>
  {
    return this.http.get<number>(`${environment.apiUrl}/pedidos/id/${idGrupo}`);    
  }
}
