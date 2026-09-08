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

  modificarDiseniadora(idDiseniadora:number, idPedido:number)
  {
    this.http.patch(`${environment.apiUrl}/pedidos/id/diseniadora`, {idDiseniadora:idDiseniadora, idPedido:idPedido});    
  }

  async modificarEstadoTalles(nuevoEstado:string, idPedido: number, fechaConfirmacion?:string)
  {
    let params: any = {nuevoEstado, idPedido};

    if (fechaConfirmacion !== undefined) 
    {
      params.fechaConfirmacion = fechaConfirmacion;
    }

    this.http.patch(`${environment.apiUrl}/pedidos/estado-talles`, {params});    
  }

  async modificarEstadoDisenio(nuevoEstado:string, idPedido: number)
  {
    this.http.patch(`${environment.apiUrl}/pedidos/estado-disenio`, {nuevoEstado:nuevoEstado, idPedido:idPedido});  
  }

  async modificarFechaAprobacionDisenio(fecha:string, idPedido: number)
  {
    this.http.patch(`${environment.apiUrl}/pedidos/fecha-disenio`, {fecha:fecha, idPedido:idPedido});  
  }

  async modificarTelefonoPrincipal(nuevoNro:string, idPedido: number)
  {
    this.http.patch(`${environment.apiUrl}/pedidos/fecha-disenio`, {nuevoNro:nuevoNro, idPedido:idPedido});  
  }
}
