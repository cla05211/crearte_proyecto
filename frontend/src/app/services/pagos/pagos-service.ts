import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PagoResponseDTO } from './dto/pagoResponse.dto';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';
import { SubirArchivoStorage } from '../storage/dtos/SubirArchivoStorage';
import { PagoComprobanteDatosDTO } from './dto/pagoComprobanteDatos.dto';
import { PagoBancoResponse } from './dto/pagoBancoResponse.dto';
import { ModificarPago } from './dto/modificarBanco.dto';
import { GenerarReciboDTO } from '../../../interfaces/generarRecibo.dto';
import { GenerarExcelDTO } from '../../../interfaces/generarExcel.dto';

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

  traerPagosBanco(banco: string, rangoDesde: number, rangoHasta:number): Observable<PagoBancoResponse[]>
  {
    return this.http.get<PagoBancoResponse[]>((`${environment.apiUrl}/pagos/bancos/${banco}`), {params:{rangoDesde, rangoHasta}});
  }

  comprobarDatosComprobante(formData: FormData): Observable<PagoComprobanteDatosDTO>
  {
    return this.http.post<PagoComprobanteDatosDTO>(`${environment.apiUrl}/pagos/ocr`, formData);
  }

  modificarAprobado(dto: ModificarPago)
  {
    return this.http.patch((`${environment.apiUrl}/pagos/aprobado`), dto);
  }

  modificarEnviadoBanco(dto: ModificarPago)
  {
    return this.http.patch((`${environment.apiUrl}/pagos/enviado`), dto);
  }

  eliminarPago(idPago: number)
  {

  }

  descargarExcel(dto: GenerarExcelDTO): Observable<Blob>
  {
    return this.http.post((`${environment.apiUrl}/pagos/excel`), dto, { responseType: 'blob' });
  }

  descargarRecibo(dto: GenerarReciboDTO): Observable<Blob>
  {
    return this.http.post((`${environment.apiUrl}/pagos/recibo`), dto, { responseType: 'blob' });
  }

  traerIdDocumento(idPago:number): Observable<number>
  {
    return (this.http.get<number>(`${environment.apiUrl}/pagos/documento/${idPago}`));
  }
}
