import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { PagoResponseDTO } from '../pagos/dto/pagoResponse.dto';
import { CuotaResponseDTO } from '../cuotas/dto/CuotaResponseDTO';
import { presupuestoPedidoClientesPage } from '../gestionPedidos/dto/PresupuestoPedidoClientePage.dto';
import { productosPedidoIdNombreDTO } from '../productosPedidos/dto/ProductoPedidoIdNombre.dto';
import { PrendaPedidoDTO } from './dto/prenda.dto';

@Injectable({
  providedIn: 'root',
})
export class ClientesPortalService
{
  http = inject(HttpClient);
  private base = `${environment.apiUrl}/clientes-portal`;

  obtenerIdPedido(): Observable<number>
  {
    return this.http.get<number>(`${this.base}/pedido`);
  }

  obtenerPagos(): Observable<PagoResponseDTO[]>
  {
    return this.http.get<PagoResponseDTO[]>(`${this.base}/pagos`);
  }

  obtenerProductosPedidosComponentes(): Observable<productosPedidoIdNombreDTO[]>
  {
    return this.http.get<productosPedidoIdNombreDTO[]>(`${this.base}/productos-componentes`);
  }

  obtenerCuotas(): Observable<CuotaResponseDTO[]>
  {
    return this.http.get<CuotaResponseDTO[]>(`${this.base}/cuotas`);
  }

  obtenerImporteTotal(): Observable<number>
  {
    return this.http.get<number>(`${this.base}/importe-total`);
  }

  obtenerSeniaTotal(): Observable<number | null>
  {
    return this.http.get<number | null>(`${this.base}/senia-total`);
  }

  determinarSecundaria(): Observable<boolean>
  {
    return this.http.get<boolean>(`${this.base}/nivel`);
  }

  obtenerPresupuesto():Observable<presupuestoPedidoClientesPage>
  {
    return this.http.get<presupuestoPedidoClientesPage>(`${this.base}/presupuesto`);
  }

  obtenerUrlDocumento(idDocumento: number): Observable<{ url: string }>
  {
    return this.http.get<{ url: string }>(`${this.base}/documento/${idDocumento}`);
  }

  obtenerPrendasPedido(): Observable<PrendaPedidoDTO[]>
  {
    return this.http.get<PrendaPedidoDTO[]>(`${this.base}/prendas`);
  }

  guardarPrendas(prendas: PrendaPedidoDTO[])
  {
    return this.http.post(`${this.base}/prendas`, prendas);
  }

  obtenerResumenTalles(): Observable<Blob>
  {
    return this.http.get(`${this.base}/resumen-talles`, { responseType: 'blob' });
  }

  determinartipoTalles(): Observable<string>
  {
    // El back devuelve el texto plano (no JSON), por eso se pide como 'text'
    return this.http.get(`${this.base}/tipo-talles`, { responseType: 'text' });
  }

  crearPago(formData: FormData)
  {
    return this.http.post(`${this.base}/pagos`, formData);
  }

  obtenerTallesConfirmados(): Observable<boolean>
  {
    return this.http.get<boolean>(`${this.base}/talles-confirmados`);
  }

  confirmarTalles(firma: Blob)
  {
    const formData = new FormData();
    formData.append('firma', firma, 'firma-talles.png');

    return this.http.post(`${this.base}/confirmar-talles`, formData);
  }
}
