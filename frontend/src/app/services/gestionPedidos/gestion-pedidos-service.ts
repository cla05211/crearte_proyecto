import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CrearPedidoDTO } from './dto/crearPedidoPost.dto';
import { environment } from '../../../environments/environment.development';
import { PedidoResponseVentas } from './dto/PedidoResponseVentas.dto';
import { Observable } from 'rxjs';
import { BeneficioResponseDTO } from './dto/BeneficioResponse.dto';
import { BeneficioPedidoPostDTO } from './dto/BeneficioPedido.dto';
import { ModificarPlanPedidoDTO } from './dto/modficaciones/ModificarPlanPedido';
import { presupuestoPedidoClientesPage } from './dto/PresupuestoPedidoClientePage.dto';
import { PedidoDTOResponse } from '../pedidos/dto/pedidoResponse.dto';
import { ControlTallesDisenioDTO } from './dto/ControlTallesDisenioDTO';

@Injectable({
  providedIn: 'root',
})
export class GestionPedidosService 
{
  http = inject(HttpClient);
  
  agregarPedido(pedido: CrearPedidoDTO): Observable<{ id_pedido: number; usuario: string; contrasenaPlana: string }>
  {
    return this.http.post<{ id_pedido: number; usuario: string; contrasenaPlana: string }>((`${environment.apiUrl}/gestion-pedidos/crear-pedido`), pedido);
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

  obtenerBeneficios(): Observable<BeneficioResponseDTO[]>
  {
    return this.http.get<BeneficioResponseDTO[]>(`${environment.apiUrl}/beneficios`);
  }

  obtenerPresupuestoPedidoClientesPage(idGrupo: number): Observable<presupuestoPedidoClientesPage>
  {
    return this.http.get<presupuestoPedidoClientesPage>(`${environment.apiUrl}/gestion-pedidos/presupuesto-clientes/${idGrupo}`);
  }

  modificarBeneficios(beneficios: BeneficioPedidoPostDTO[], idPedido: number): Observable<{ nuevosBeneficios: BeneficioPedidoPostDTO[] }>
  {
    return this.http.patch<{ nuevosBeneficios: BeneficioPedidoPostDTO[] }>(`${environment.apiUrl}/beneficios-pedido/${idPedido}`, beneficios);
  }

  modificarProductosCuotas(dto: ModificarPlanPedidoDTO)
  {
      return this.http.patch(`${environment.apiUrl}/gestion-pedidos/modificar-pedidos`, dto);
  }

  obtenerImporteTotalPedido(idPedido:number):Observable<number>
  {
    return this.http.get<number>(`${environment.apiUrl}/gestion-pedidos/importe/${idPedido}`);
  }

  obtenerDatosPedidosControlTallesDisenio(mes:number, promo:number,busqueda?:string):Observable<ControlTallesDisenioDTO[]>
  {
    let params: any = {mes, promo};

    if (busqueda !== undefined) 
    {
      params.busqueda = busqueda;
    }

    return this.http.get<ControlTallesDisenioDTO[]>(`${environment.apiUrl}/gestion-pedidos/control-talles-disenio`, {params});
  }
}
