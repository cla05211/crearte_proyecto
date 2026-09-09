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

  modificarDiseniadora(idDiseniadora:number, idPedido:number): Observable<void>
  {
    return this.http.patch<void>(`${environment.apiUrl}/pedidos/diseniadora`, null, {params: {idDiseniadora, idPedido}});
  }

  modificarEstadoTalles(nuevoEstado:string, idPedido: number, fechaConfirmacion?:string): Observable<void>
  {
    let params: any = {nuevoEstado, idPedido};

    if (fechaConfirmacion !== undefined)
    {
      params.fechaConfirmacion = fechaConfirmacion;
    }

    return this.http.patch<void>(`${environment.apiUrl}/pedidos/estado-talles`, null, {params});
  }

  modificarEstadoDisenio(nuevoEstado:string, idPedido: number): Observable<void>
  {
    return this.http.patch<void>(`${environment.apiUrl}/pedidos/estado-disenio`, null, {params: {nuevoEstado, idPedido}});
  }

  modificarFechaAprobacionDisenio(fecha:string, idPedido: number): Observable<void>
  {
    return this.http.patch<void>(`${environment.apiUrl}/pedidos/fecha-disenio`, null, {params: {fecha, idPedido}});
  }

  modificarTelefonoPrincipal(nuevoNro:string, idPedido: number): Observable<void>
  {
    return this.http.patch<void>(`${environment.apiUrl}/pedidos/numero`, null, {params: {nuevoNro, idPedido}});
  }

  enviarPedidoFabrica(idPedido:number):Observable<{ nroFabrica: number }>
  {
    return this.http.post<{ nroFabrica: number }>(`${environment.apiUrl}/pedidos/fabrica/${idPedido}`,null);
  }
}
