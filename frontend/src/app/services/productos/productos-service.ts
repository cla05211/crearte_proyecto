import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProductoDBDTO } from './dto/productoDB.dto';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';
import { AgregadoDBDTO } from './dto/agregadoDB.dto';
import { ProductoPOSTDTO } from './dto/productoPOST.dto';
import { AgregadoPOSTDTO } from './dto/agregadoPOST.dto';

@Injectable({
  providedIn: 'root',
})
export class ProductosService 
{
    http = inject(HttpClient);

    obtenerProductos(): Observable<ProductoDBDTO[]>
    {
        return this.http.get<ProductoDBDTO[]>(`${environment.apiUrl}/productos`);
    }

    obtenerAgregados(): Observable<AgregadoDBDTO[]>
    {
        return this.http.get<AgregadoDBDTO[]>(`${environment.apiUrl}/productos/agregados`);
    }   

    agregarProducto(producto:ProductoPOSTDTO): Observable<ProductoDBDTO>
    {
        return this.http.post<ProductoDBDTO>((`${environment.apiUrl}/productos`), producto)
    }

    agregarAgregado(agregado: AgregadoPOSTDTO)
    {
        return this.http.post<AgregadoDBDTO>((`${environment.apiUrl}/productos/agregado`), agregado)
    }

    eliminarProducto(id:number)
    {
        return this.http.delete(`${environment.apiUrl}/${id}`);
    }

    eliminarAgregado(id:number)
    {
        return this.http.delete(`${environment.apiUrl}/agregado/${id}`);
    }
}
