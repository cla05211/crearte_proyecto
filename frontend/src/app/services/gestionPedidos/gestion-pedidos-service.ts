import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CrearPedidoDTO } from './dto/crearPedidoPost.dto';
import { environment } from '../../../environments/environment';
import { PedidoResponseVentas } from './dto/PedidoResponseVentas.dto';
import { Observable } from 'rxjs';
import { BeneficioResponseDTO } from './dto/BeneficioResponse.dto';
import { BeneficioPedidoPostDTO } from './dto/BeneficioPedido.dto';
import { ModificarPlanPedidoDTO } from './dto/modficaciones/ModificarPlanPedido';
import { presupuestoPedidoClientesPage } from './dto/PresupuestoPedidoClientePage.dto';
import { PedidoDTOResponse } from '../pedidos/dto/pedidoResponse.dto';
import { ControlTallesDisenioDTO } from './dto/ControlTallesDisenioDTO';
import { ControlProduccionDTO } from './dto/ControlProduccionDTO';
import { ControlBanderasDTO, ModificarBanderaDTO } from './dto/ControlBanderasDTO';
import { AuditoriaPaginaDTO, FiltrosAuditoria } from './dto/AuditoriaDTO';

export type BancoDevolucion = 'COMAFI' | 'Santander' | 'Efectivo';

@Injectable({
  providedIn: 'root',
})
export class GestionPedidosService 
{
  http = inject(HttpClient);
  
  agregarPedido(pedido: CrearPedidoDTO): Observable<{ id_pedido: number; usuario: string }>
  {
    return this.http.post<{ id_pedido: number; usuario: string }>((`${environment.apiUrl}/gestion-pedidos/crear-pedido`), pedido);
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

  obtenerDatosControlProduccion(mesEntrega: number, anioEntrega: number, enviadosFabrica: boolean):Observable<ControlProduccionDTO[]>
  {
    return this.http.get<ControlProduccionDTO[]>(`${environment.apiUrl}/gestion-pedidos/control-produccion`, {params:{mesEntrega,anioEntrega,enviadosFabrica}});
  }

  // Asigna nro de fábrica, fecha de entrega (y última cuota) y pasa el pedido a "En producción"
  enviarPedidoFabrica(idPedido: number, mesEntrega: number, anioEntrega: number):Observable<{ nroFabrica: number; whatsappEnviado: boolean }>
  {
    return this.http.post<{ nroFabrica: number; whatsappEnviado: boolean }>(
      `${environment.apiUrl}/gestion-pedidos/enviar-fabrica/${idPedido}`, { mesEntrega, anioEntrega });
  }

  obtenerPedidosControlBandera(mes: number, anio: number):Observable<ControlBanderasDTO[]>
  {
    return this.http.get<ControlBanderasDTO[]>(`${environment.apiUrl}/gestion-pedidos/control-banderas`, {params:{mes,anio}});
  }

  // Solo se actualizan los campos que vienen en el dto
  modificarBandera(idBandera: number, dto: ModificarBanderaDTO)
  {
    return this.http.patch(`${environment.apiUrl}/gestion-pedidos/banderas/${idBandera}`, dto);
  }


  // Baja del colegio: pasa el pedido a "Cancelado" y, si se devolvió la plata, carga el pago negativo
  cancelarPedido(idPedido: number, devolucionPlata: boolean, banco?: BancoDevolucion): Observable<void>
  {
    return this.http.patch<void>(`${environment.apiUrl}/gestion-pedidos/cancelar/${idPedido}`, { devolucionPlata, banco });
  }

  //--- Auditoría ---

  obtenerAuditoria(rangoDesde: number, rangoHasta: number, filtros: FiltrosAuditoria): Observable<AuditoriaPaginaDTO>
  {
    const params: Record<string, string | number | boolean> = { rangoDesde, rangoHasta };

    if (filtros.tipo) params['tipo'] = filtros.tipo;
    if (filtros.busqueda) params['busqueda'] = filtros.busqueda;
    if (filtros.idPedido) params['idPedido'] = filtros.idPedido;

    return this.http.get<AuditoriaPaginaDTO>(`${environment.apiUrl}/gestion-pedidos/auditoria`, { params });
  }

  obtenerUrlArchivoAuditoria(idAuditoria: number, version: 'anterior' | 'nuevo'): Observable<{ url: string }>
  {
    return this.http.get<{ url: string }>(`${environment.apiUrl}/gestion-pedidos/auditoria/${idAuditoria}/archivo`, { params: { version } });
  }
}
