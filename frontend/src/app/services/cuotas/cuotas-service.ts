import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CuotaResponseDTO } from './dto/CuotaResponseDTO';
import { environment } from '../../../environments/environment.development';
import { ModificarImporteCuotasDTO } from './dto/ModificarImporteCuotasDTO';
import { Observable } from 'rxjs';
import { CrearCuotasDTO } from './dto/crearCuotas.dto';
import { PagarCuotaDTO } from './dto/PagarCuota.dto';
import { ModificarImporteCuotaDTO } from './dto/ModificarImporteCuotaDTO copy';

@Injectable({
  providedIn: 'root',
})
export class CuotasService 
{
  http = inject(HttpClient);  

  agregarCuotas(dto: CrearCuotasDTO)
  {
      return this.http.post((`${environment.apiUrl}/cuotas`), dto)
  }

  traerCuotasIdPedido(idPedido: number): Observable<CuotaResponseDTO[]>
  {
    return this.http.get<CuotaResponseDTO[]>((`${environment.apiUrl}/cuotas/${idPedido}`));
  }

  traerCuotasPendientesIdPedido(idPedido: number): Observable<CuotaResponseDTO[]>
  {
    return this.http.get<CuotaResponseDTO[]>((`${environment.apiUrl}/cuotas/pendientes/${idPedido}`));
  }  

  modificarImporteCuotasPendientesPedido(dto: ModificarImporteCuotasDTO)
  {
    return this.http.patch((`${environment.apiUrl}/cuotas/importe-cuotas`), dto);
  }

  modificarImporteUnaCuotasPedido(dto: ModificarImporteCuotaDTO)
  {
    return this.http.patch((`${environment.apiUrl}/cuotas/importe-cuota`), dto);
  }

  pagarCuotasPedido(dto: PagarCuotaDTO)
  {
    return this.http.patch((`${environment.apiUrl}/cuotas/pagar`), dto);
  }

  eliminarCuotasPedido(idPedido: number)
  {
    return this.http.delete(`${environment.apiUrl}/cuotas/${idPedido}`);
  }
}
