import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { PagoResponseDTO } from '../pagos/dto/pagoResponse.dto';
import { CuotaResponseDTO } from '../cuotas/dto/CuotaResponseDTO';
import { CrearPagoClienteDTO } from './dto/crearPagoClienteDTO';
import { SubirArchivoStorage } from '../storage/dtos/SubirArchivoStorage';


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

  crearPago(dto: CrearPagoClienteDTO)
  {
    return this.http.post(`${this.base}/pagos`, dto);
  }

  obtenerUrlDocumento(idDocumento: number): Observable<{ url: string }>
  {
    return this.http.get<{ url: string }>(`${this.base}/documento/${idDocumento}`);
  }
}
