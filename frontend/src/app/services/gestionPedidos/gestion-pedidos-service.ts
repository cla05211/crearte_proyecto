import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CrearPedidoDTO } from './dto/crearPedidoPost.dto';
import { environment } from '../../../environments/environment.development';
import { PedidoResponseVentas } from './dto/PedidoResponseVentas.dto';
import { Observable } from 'rxjs';
import { ModificarBeneficioDto } from './dto/modficaciones/modficiarBeneficio.dto';
import { ModificarPlanPedidoDTO } from './dto/modficaciones/ModificarPlanPedido';

@Injectable({
  providedIn: 'root',
})
export class GestionPedidosService 
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

  modificarBeneficio(dto: ModificarBeneficioDto, idPedido: number): Observable<{nuevoBeneficio: string}>
  {
    return this.http.patch<{nuevoBeneficio:string}>((`${environment.apiUrl}/beneficios/${idPedido}`), dto);
  }

  modificarProductosCuotas(dto: ModificarPlanPedidoDTO)
  {
      return this.http.patch(`${environment.apiUrl}/gestion-pedidos/modificar-plan`, dto);
  }

}
