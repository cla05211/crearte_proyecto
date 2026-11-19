import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService, tipoArchivo, UrlSubida } from '../storage/storage-service';
import { ColumnaDatoSimple, DatosSimplesEnvio, FormaEntrega, MedioPagoEnvio, PedidoEntregadoDTO, PedidoEnvioDTO } from './dto/PedidoEnvioDTO';

@Injectable({
  providedIn: 'root',
})
export class GestionEnviosService
{
  http = inject(HttpClient);
  private storageService = inject(StorageService);

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

  // medioPago es obligatorio para los envíos gratis con cotización (define cómo se registra en caja)
  modificarCotizacion(idPedido: number, cotizacion: number | null, medioPago: MedioPagoEnvio | null): Observable<void>
  {
    return this.http.patch<void>(`${this.url}/${idPedido}/cotizacion`, { cotizacion, medioPago });
  }

  confirmarEntrega(idPedido: number, fechaEntrega: string, formaEntrega: FormaEntrega): Observable<void>
  {
    return this.http.patch<void>(`${this.url}/${idPedido}/entrega`, { fechaEntrega, formaEntrega });
  }

  subirComprobante(idPedido: number, archivo: File): Observable<{ idDocumento: number }>
  {
    // Primero sube el archivo directo a Supabase y después lo asocia al envío
    const pedirUrl = this.http.post<UrlSubida>(`${this.url}/${idPedido}/comprobante/url-subida`, {
      nombreArchivo: archivo.name,
      mimetype: tipoArchivo(archivo),
    });

    return this.storageService.subirConUrl(pedirUrl, archivo).pipe(
      switchMap((ruta) => this.http.post<{ idDocumento: number }>(`${this.url}/${idPedido}/comprobante`, { ruta })),
    );
  }
}
