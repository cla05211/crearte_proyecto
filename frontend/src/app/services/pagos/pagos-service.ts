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
import { GenerarContratoDTO } from '../../../interfaces/generarContrato.dto';
import { GenerarExcelDTO } from '../../../interfaces/generarExcel.dto';
import { PagoDTO } from '../gestionPedidos/dto/pago.dto';

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

  crearPago(dto:PagoDTO)
  {
    return this.http.post(`${environment.apiUrl}/pagos/`, dto);
  }

  eliminarPago(idPago:number)
  {
    return this.http.delete(`${environment.apiUrl}/pagos/${idPago}`);
  }

  modificarAprobado(dto: ModificarPago)
  {
    return this.http.patch((`${environment.apiUrl}/pagos/aprobado`), dto);
  }

  modificarEnviadoBanco(dto: ModificarPago)
  {
    return this.http.patch((`${environment.apiUrl}/pagos/enviado`), dto);
  }

  descargarExcel(dto: GenerarExcelDTO): Observable<Blob>
  {
    return this.http.post((`${environment.apiUrl}/pagos/excel`), dto, { responseType: 'blob' });
  }

  descargarRecibo(dto: GenerarReciboDTO): Observable<Blob>
  {
    return this.http.post((`${environment.apiUrl}/pagos/recibo`), dto, { responseType: 'blob' });
  }

  descargarReciboPago(idPago: number): Observable<Blob>
  {
    return this.http.get((`${environment.apiUrl}/pagos/${idPago}/recibo`), { responseType: 'blob' });
  }

  descargarContrato(dto: GenerarContratoDTO): Observable<Blob>
  {
    return this.http.post((`${environment.apiUrl}/pagos/contrato`), dto, { responseType: 'blob' });
  }

  traerIdDocumento(idPago:number): Observable<number>
  {
    return (this.http.get<number>(`${environment.apiUrl}/pagos/documento/${idPago}`));
  }

  traerTotalMes(fechaHoy:Date):Observable<number>
  {
    return this.http.get<number>(`${environment.apiUrl}/pagos/total/`,{params:{fechaHoy: fechaHoy.toISOString()}});
  }

  traerTotalIngresosEfectivos():Observable<number>
  {
    return this.http.get<number>(`${environment.apiUrl}/pagos/ingresos-efectivo`);
  }
}
