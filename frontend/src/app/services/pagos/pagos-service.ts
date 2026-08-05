import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PagoResponseDTO } from './dto/pagoResponse.dto';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PagosService 
{
  http = inject(HttpClient);  

  traerPagosIdPedido(idPedido: number): Observable<PagoResponseDTO[]>
  {
    return this.http.get<PagoResponseDTO[]>((`${environment.apiUrl}/pagos/${idPedido}`));
  }
}
