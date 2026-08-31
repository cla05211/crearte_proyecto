import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProductoConPrecioResponseDTO } from './dto/ProductoConPrecioResponse';
import { environment } from '../../../environments/environment.development';
import { Observable } from 'rxjs';
import { AgregadoDBDTO } from './dto/agregadoDB.dto';
import { ProductoPostDTO } from './dto/productoPOST.dto';
import { AgregadoPOSTDTO } from './dto/agregadoPOST.dto';
import { PreciosBeneficiosResponseDTO } from './dto/PreciosBeneficiosResponse.dto';
import { ProductoPreciosDTO } from './dto/ProductoPrecios.dto';

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

    obtenerPreciosProducto(idProducto:number, nroCuotas:number, cantidad:number): Observable<ProductoPreciosDTO>
    {
        return this.http.get<ProductoPreciosDTO>(`${environment.apiUrl}/productos/precios`,{params:{idProducto: idProducto, cuotas: nroCuotas, cantidad: cantidad}});
    }   

    obtenerPrecioAgregadoGobal()
    {
        
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

    obtenerPrecioBeneficioProducto(producto: number, cuotas:number, cantidad:number)
    {
        return this.http.get<PreciosBeneficiosResponseDTO>(`${environment.apiUrl}/productos/precio-beneficio`,{
            params:
            {
                idProducto: producto,
                cantidad: cantidad,
                cuotas: cuotas
            }
        });
    }

    obtenerCuotasDisponibles(): Observable<number[]>
    {
        return this.http.get<number[]>(`${environment.apiUrl}/productos/cuotas-disponibles`);
    }
}
