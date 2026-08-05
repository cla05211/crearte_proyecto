import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CuotaResponseDTO } from './dto/CuotaResponseDTO';
import { environment } from '../../../environments/environment.development';
import { ModificarImporteCuotaDTO } from './dto/ModificarImporteCuotaDTO';

@Injectable({
  providedIn: 'root',
})
export class CuotasService 
{
  http = inject(HttpClient);  

  traerCuotasPendientesIdPedido(idPedido: number)
  {
    return this.http.get((`${environment.apiUrl}/cuotas/${idPedido}`));
  }  

  modificarImporteCuotasPendientesPedido(dto: ModificarImporteCuotaDTO)
  {
    return this.http.patch((`${environment.apiUrl}/cuotas/importe`), dto);
  }
}
