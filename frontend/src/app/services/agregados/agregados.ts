import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AgregadoDTO } from './dto/Agregado.dto';
import { environment } from '../../../environments/environment';
import { ModificarAgregadoPrecioDTO } from './dto/ModificarAgregadoPrecio.dto';

@Injectable({
  providedIn: 'root',
})
export class Agregados 
{
    http = inject(HttpClient);

    obtenerAgregados(): Observable<AgregadoDTO[]>
    {
        return this.http.get<AgregadoDTO[]>(`${environment.apiUrl}/agregados`);
    }

    modificarPrecios(dto: ModificarAgregadoPrecioDTO[]): Observable<number>
    {
        return this.http.patch<number>(`${environment.apiUrl}/agregados/precios`, dto);
    }
}
