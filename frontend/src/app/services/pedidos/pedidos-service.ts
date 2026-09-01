import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PedidosService 
{
  http = inject(HttpClient);  

  obtenerIdVendedora(idPedido:number):Observable<number>
  {
    return this.http.get<number>(`${environment.apiUrl}/pedidos/${idPedido}`);
  }

  obtenerIdPedidoGrupo(idGrupo:number):Observable<number>
  {
    return this.http.get<number>(`${environment.apiUrl}/pedidos/id/${idGrupo}`);    
  }
}
