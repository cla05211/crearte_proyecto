import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CrearPedidoDTO } from './dto/crearPedidoPost.dto';
import { environment } from '../../../environments/environment.development';
import { PedidoResponseVentas } from './dto/PedidoResponseVentas.dto';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PedidosService 
{
  http = inject(HttpClient);
  
  agregarPedido(pedido: CrearPedidoDTO)
  {
    return this.http.post<CrearPedidoDTO>((`${environment.apiUrl}/gestion-pedidos/crear-pedido`), pedido);
  }

  obtenerPedidos(): Observable<PedidoResponseVentas[]>
  {
    return this.http.get<PedidoResponseVentas[]>(`${environment.apiUrl}/gestion-pedidos`);
  }

  obtenerBeneficios(): Observable<string[]>
  {
    return this.http.get<string[]>(`${environment.apiUrl}/beneficios`);
  }
}
