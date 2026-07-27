import { Component, inject, signal, effect} from '@angular/core';
import { CrearPedidoDTO } from '../../services/pedidos/dto/crearPedidoPost.dto';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { Productos } from '../productos/productos';
import { ProductoConPrecioResponseDTO } from '../../services/productos/dto/ProductoConPrecioResponse';
import { ProductosService } from '../../services/productos/productos-service';
import { AgregadoDBDTO } from '../../services/productos/dto/agregadoDB.dto';
import { PedidoResponseVentas } from '../../services/pedidos/dto/PedidoResponseVentas.dto';


@Component({
  selector: 'app-ventas',
  imports: [effect],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
export class Ventas 
{
  pedidosService = inject(PedidosService);
  productosService = inject(ProductosService);
  ventas = signal<PedidoResponseVentas[]>([]);
  productos = signal<ProductoConPrecioResponseDTO[]>([]);
  agregados = signal<AgregadoDBDTO[]>([]);
  nuevoPedido: null | CrearPedidoDTO = null;
  cargando = signal(false);
  id_producto = signal<number | null>(null);
  cuotas = signal<number | null>(null);
  cantidad = signal<number | null>(null);
  valor_cuota = signal<number | null>(null);
  valor_senia = signal<number | null>(null);
  beneficio = signal<string |null>(null);

  constructor()
  {
  //Aca para obtener precio y el beneficio
    effect(() => {
      const id_producto = this.id_producto();
      const cuotas = this.cuotas();
      const cantidad = this.cantidad();

      if(id_producto != null && cantidad != null && cuotas != null)
      {
        this.productosService.obtenerPrecioBeneficioProducto(id_producto, cuotas, cantidad).subscribe(
          {
            next: (producto) => 
            {
              this.valor_cuota.set(producto.valor_cuota);
              this.valor_senia.set(producto.valor_senia);
              this.beneficio.set(producto.beneficio);
            }
          });
      }
    })
  }

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
    this.cargando.set(true);
    this.pedidosService.obtenerPedidos().subscribe({
      next: (ventas) => 
        {
          this.ventas.set(ventas);
          this.cargando.set(false);
        }
    })
  }

  async agregarVenta()
  {
    await this.pedidosService.agregarPedido(this.nuevoPedido);
  }
}
