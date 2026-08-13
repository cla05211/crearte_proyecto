import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EliminarProductoPedidoDTO } from './dto/EliminarProductoPedido.dto';
import { environment } from '../../../environments/environment.development';
import { ModificarDescripcionProductoPedido } from './dto/ModificarDescripcionProductoPedido.dto copy';
import { ModificarCantidadProductoPedido } from './dto/ModificarCantidadProductoPedido.dto';
import { ProductoPedidoDTO } from '../gestionPedidos/dto/ProductoPedido.dto';

@Injectable({
  providedIn: 'root',
})
export class ProductosPedidoService 
{
  http = inject(HttpClient);  

  crearProductosPedido(dto: ProductoPedidoDTO[])
  {
    return this.http.post((`${environment.apiUrl}/productos-pedido`), dto);
  }

  eliminarTodosProductoPedido(idPedido: number)
  {
    return this.http.delete(`${environment.apiUrl}/productos-pedido/${idPedido}`);
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
