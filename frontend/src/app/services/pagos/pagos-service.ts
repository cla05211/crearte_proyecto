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

  traerPagosBanco(banco: string): Observable<PagoBancoResponse[]>
  {
    return this.http.get<PagoBancoResponse[]>((`${environment.apiUrl}/pagos/bancos/${banco}`));
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

  eliminarPago(idPago: int)
  {
    
  }

  descargarExcel(dto: GenerarExcelDTO)
  {
    return this.http.patch((`${environment.apiUrl}/pagos/excel`), dto);
  }

  descargarRecibo(dto:GenerarReciboDTO)
  {
    return this.http.patch((`${environment.apiUrl}/pagos/recibo`), dto);
  }
}
