import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CrearPedidoDTO } from './dto/crearPedidoPost.dto';
import { environment } from '../../../environments/environment.development';
import { PedidoResponseVentas } from './dto/PedidoResponseVentas.dto';
import { Observable } from 'rxjs';
import { ModificarBeneficioDto } from './dto/modficaciones/modficiarBeneficio.dto';
import { ModificarPlanPedidoDTO } from './dto/modficaciones/ModificarPlanPedido';
import { presupuestoPedidoClientesPage } from './dto/PresupuestoPedidoClientePage.dto';
import { PedidoDTOResponse } from '../pedidos/dto/pedidoResponse.dto';

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

  obtenerPedidos(rangoDesde:number, rangoHasta:number, busqueda?: string, promo?:number): Observable<PedidoResponseVentas[]>
  {
    let params: any = {rangoDesde, rangoHasta};

    if (busqueda !== undefined) 
    {
      params.busqueda = busqueda;
    }

    if (promo !== undefined) 
    {
      params.promo = promo;
    }

    return this.http.get<PedidoResponseVentas[]>(`${environment.apiUrl}/gestion-pedidos`, {params});
  }

  obtenerBeneficios(): Observable<string[]>
  {
    return this.http.get<string[]>(`${environment.apiUrl}/beneficios`);
  }

  obtenerPresupuestoPedidoClientesPage(idGrupo: number): Observable<presupuestoPedidoClientesPage>
  {
    return this.http.get<presupuestoPedidoClientesPage>(`${environment.apiUrl}/gestion-pedidos/presupuesto-clientes/${idGrupo}`);
  }

  modificarBeneficio(dto: ModificarBeneficioDto, idPedido: number): Observable<{'nuevoBeneficio':string}>
  {
    return this.http.patch<{'nuevoBeneficio': string}>((`${environment.apiUrl}/beneficios/${idPedido}`), dto);
  }

  modificarProductosCuotas(dto: ModificarPlanPedidoDTO)
  {
      return this.http.patch(`${environment.apiUrl}/gestion-pedidos/modificar-pedidos`, dto);
  }

  obtenerImporteTotalPedido(idPedido:number):Observable<number>
  {
    return this.http.get<number>(`${environment.apiUrl}/gestion-pedidos/importe/${idPedido}`);
  }

}
