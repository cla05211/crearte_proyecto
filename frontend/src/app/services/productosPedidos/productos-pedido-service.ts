import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EliminarProductoPedidoDTO } from './dto/EliminarProductoPedido.dto';
import { environment } from '../../../environments/environment.development';
import { ModificarDescripcionProductoPedido } from './dto/ModificarDescripcionProductoPedido.dto copy';
import { ModificarCantidadProductoPedido } from './dto/ModificarCantidadProductoPedido.dto';

@Injectable({
  providedIn: 'root',
})
export class ProductosPedidoService 
{
  http = inject(HttpClient);  

  eliminarProductoPedido(dto: EliminarProductoPedidoDTO)
  {
    return this.http.delete((`${environment.apiUrl}/productos-pedido`), {body:dto});
  }

  modficarDescripcionProductoPedido(dto: ModificarDescripcionProductoPedido)
  {
    return this.http.patch((`${environment.apiUrl}/productos-pedido/descripcion`), dto);
  }

    modficarCantidadProductoPedido(dto: ModificarCantidadProductoPedido)
  {
    return this.http.patch((`${environment.apiUrl}/productos-pedido/cantidad`), dto);
  }
}
