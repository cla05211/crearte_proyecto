import { TramoBeneficiosDTO } from './dto/BeneficioTramo.dto';
import { PlanDisponibleDTO } from './dto/PlanDisponible.dto';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ProductoConPrecioResponseDTO } from './dto/ProductoConPrecioResponse';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { AgregadoDBDTO } from './dto/agregadoDB.dto';
import { ProductoPostDTO } from './dto/productoPOST.dto';
import { AgregadoPOSTDTO } from './dto/agregadoPOST.dto';
import { PreciosBeneficiosResponseDTO } from './dto/PreciosBeneficiosResponse.dto';
import { ProductoPreciosDTO } from './dto/ProductoPrecios.dto';
import { ModificarProductoPreciosDTO } from './dto/ModificarProductoPrecios.dto';
import { AgregarPlanDTO } from './dto/AgregarPlanDTO';

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

    // idGrupo: precios vigentes a la fecha de venta de ese grupo (presupuesto). Sin él, catálogo actual (ventas).
    obtenerAgregados(idGrupo?: number): Observable<AgregadoDBDTO[]>
    {
        const params: Record<string, number> = {};
        if (idGrupo) params['idGrupo'] = idGrupo;
        return this.http.get<AgregadoDBDTO[]>(`${environment.apiUrl}/productos/agregados`, { params });
    }   

    obtenerPreciosProducto(idProducto:number, nroCuotas:number, cantidad:number, conSenia?: boolean): Observable<ProductoPreciosDTO>
    {
        const params: Record<string, number | boolean> = {idProducto: idProducto, cuotas: nroCuotas, cantidad: cantidad};
        if (conSenia !== undefined) params['conSenia'] = conSenia;
        return this.http.get<ProductoPreciosDTO>(`${environment.apiUrl}/productos/precios`,{params});
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

    // conSenia distingue dos planes con la misma cantidad de cuotas (con y sin seña)
    // idGrupo: precios vigentes a la fecha de venta de ese grupo (presupuesto). Sin él, catálogo actual (ventas).
    obtenerPrecioBeneficioProducto(producto: number, cuotas:number, cantidad:number, conSenia: boolean, idGrupo?: number)
    {
        const params: Record<string, number | boolean> = { idProducto: producto, cantidad: cantidad, cuotas: cuotas, conSenia: conSenia };
        if (idGrupo) params['idGrupo'] = idGrupo;
        return this.http.get<PreciosBeneficiosResponseDTO>(`${environment.apiUrl}/productos/precio-beneficio`, { params });
    }

    obtenerPlanesDisponibles(): Observable<PlanDisponibleDTO[]>
    {
        return this.http.get<PlanDisponibleDTO[]>(`${environment.apiUrl}/productos/planes-disponibles`);
    }
        
    //productospage    

    modificarPreciosProducto(idProducto:number, dto:ModificarProductoPreciosDTO[]): Observable<number>
    {
        return this.http.patch<number>(`${environment.apiUrl}/productos/precios`,dto,{params:{idProducto}});
    }

    // Beneficios por tramo de un producto: se guardan en todos sus planes
    modificarBeneficiosProducto(idProducto: number, tramos: TramoBeneficiosDTO[]): Observable<number>
    {
        return this.http.patch<number>(`${environment.apiUrl}/productos/beneficios`, tramos, { params: { idProducto } });
    }

    activarPlan(cuotas:number,senia:boolean,activo:boolean)
    {
        // El segundo parámetro de patch es el body: los params van en el tercero
        return this.http.patch(`${environment.apiUrl}/productos/activar-plan`, null, {params:{cuotas,senia,activo}});
    }

    agregarPlan(plan: AgregarPlanDTO)
    {
        return this.http.post((`${environment.apiUrl}/productos/plan`), plan);
    }
}
