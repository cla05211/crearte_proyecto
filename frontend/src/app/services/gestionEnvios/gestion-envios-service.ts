import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ColumnaDatoSimple, DatosSimplesEnvio, FormaEntrega, PedidoEntregadoDTO, PedidoEnvioDTO } from './dto/PedidoEnvioDTO';

@Injectable({
  providedIn: 'root',
})
export class GestionEnviosService
{
  http = inject(HttpClient);

  private readonly url = `${environment.apiUrl}/gestion-envios-pedidos`;

  obtenerPedidosListosParaEnviar(): Observable<PedidoEnvioDTO[]>
  {
    return this.http.get<PedidoEnvioDTO[]>(`${this.url}/listos-enviar`);
  }

  obtenerPedidosEntregados(mesEntrega: number, anioEntrega: number): Observable<PedidoEntregadoDTO[]>
  {
    return this.http.get<PedidoEntregadoDTO[]>(`${this.url}/enviados`, { params: { mesEntrega, anioEntrega } });
  }

  // Pasa el pedido a "Listo para entregar" y lo agrega a envíos (desde Control de fábrica)
  marcarListoParaEntregar(idPedido: number): Observable<void>
  {
    return this.http.post<void>(`${this.url}/${idPedido}`, null);
  }

  modificarDato<C extends ColumnaDatoSimple>(idPedido: number, columna: C, dato: DatosSimplesEnvio[C]): Observable<void>
  {
    return this.http.patch<void>(`${this.url}/${idPedido}/dato`, { columna, dato });
  }

  modificarCotizacion(idPedido: number, cotizacion: number | null): Observable<void>
  {
    return this.http.patch<void>(`${this.url}/${idPedido}/cotizacion`, { cotizacion });
  }

  confirmarEntrega(idPedido: number, fechaEntrega: string, formaEntrega: FormaEntrega): Observable<void>
  {
    return this.http.patch<void>(`${this.url}/${idPedido}/entrega`, { fechaEntrega, formaEntrega });
  }

  subirComprobante(idPedido: number, archivo: File): Observable<{ idDocumento: number }>
  {
    const formData = new FormData();
    formData.append('comprobante', archivo, archivo.name);

    return this.http.post<{ idDocumento: number }>(`${this.url}/${idPedido}/comprobante`, formData);
  }
}
