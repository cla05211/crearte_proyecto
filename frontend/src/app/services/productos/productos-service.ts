import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProductoConPrecioResponseDTO } from './dto/ProdcutoConPrecioResponse';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';
import { AgregadoDBDTO } from './dto/agregadoDB.dto';
import { ProductoPostDTO } from './dto/productoPOST.dto';
import { AgregadoPOSTDTO } from './dto/agregadoPOST.dto';

@Injectable({
  providedIn: 'root',
})
export class ProductosService 
{
    http = inject(HttpClient);

    obtenerProductos(): Observable<ProductoConPrecioResponseDTO[]>
    {
        return this.http.get<ProductoConPrecioResponseDTO[]>(`${environment.apiUrl}/productos`);
    }

    obtenerAgregados(): Observable<AgregadoDBDTO[]>
    {
        return this.http.get<AgregadoDBDTO[]>(`${environment.apiUrl}/productos/agregados`);
    }   

    agregarProducto(producto:ProductoPostDTO): Observable<ProductoConPrecioResponseDTO>
    {
        return this.http.post<ProductoConPrecioResponseDTO>((`${environment.apiUrl}/productos`), producto)
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
