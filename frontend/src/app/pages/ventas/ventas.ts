import { Component, inject, signal } from '@angular/core';
import { CrearPedidoDTO } from '../../services/pedidos/dto/crearPedidoPost.dto';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { Productos } from '../productos/productos';
import { ProductoConPrecioResponseDTO } from '../../services/productos/dto/ProdcutoConPrecioResponse';
import { ProductosService } from '../../services/productos/productos-service';
import { AgregadoDBDTO } from '../../services/productos/dto/agregadoDB.dto';


@Component({
  selector: 'app-ventas',
  imports: [],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
export class Ventas 
{
  pedidosService = inject(PedidosService);
  productosService = inject(ProductosService);
  ventas = signal<CrearPedidoDTO[]>([]);
  productos = signal<ProductoConPrecioResponseDTO[]>([]);
  agregados = signal<AgregadoDBDTO[]>([]);
  nuevoPedido: null | CrearPedidoDTO = null;
  cargando = signal(false);
  
  ngOnInit(): void
  {
    this.obtenerVentas();
    this.obtenerProductos();
    this.obtenerAgregados();
  }

  obtenerProductos()
  {
    this.productosService.obtenerProductos().subscribe({
      next: (productos) => 
        {
          this.productos.set(productos);
        }
    })
  }

  obtenerAgregados()
  {
    this.productosService.obtenerAgregados().subscribe({
      next: (agregados) => 
        {
          this.agregados.set(agregados);
        }
    })
  }

  async obtenerVentas()
  {
    
  }

  async agregarVenta()
  {
    await this.pedidosService.agregarPedido(this.nuevoPedido);
  }
}
