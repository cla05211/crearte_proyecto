import { Component, inject, signal, effect, computed} from '@angular/core';
import { CrearPedidoDTO } from '../../services/pedidos/dto/crearPedidoPost.dto';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { Productos } from '../productos/productos';
import { ProductoConPrecioResponseDTO } from '../../services/productos/dto/ProductoConPrecioResponse';
import { ProductosService } from '../../services/productos/productos-service';
import { AgregadoDBDTO } from '../../services/productos/dto/agregadoDB.dto';
import { PedidoResponseVentas } from '../../services/pedidos/dto/PedidoResponseVentas.dto';
import { faL } from '@fortawesome/free-solid-svg-icons';
import { map } from 'rxjs';
import { ProductoSeleccionado } from './interfaces/ProductoSeleccionado';


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
  ventas = signal<PedidoResponseVentas[]>([]);
  productosDisponibles = signal<ProductoConPrecioResponseDTO[]>([]);
  agregadosDisponibles = signal<AgregadoDBDTO[]>([]);
  nuevoPedido: null | CrearPedidoDTO = null;
  cargando = signal(false);
  id_producto = signal<number | null>(null);
  cuotas = signal<number | null>(null);
  cantidad = signal<number | null>(null);
  valor_cuota = signal<number | null>(null);
  valor_senia = signal<number | null>(null);
  beneficio = signal<string |null>(null);
  productoActual = signal<ProductoSeleccionado | null>(null);
  productosSeleccionados = signal<ProductoSeleccionado[]>([]);

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
    this.obtenerProductosDisponibles();
    this.obtenerAgregadosDisponibles();
  }

  obtenerProductosDisponibles()
  {
    this.productosService.obtenerProductos().subscribe({
      next: (productos) => 
        {
          this.productosDisponibles.set(productos);
        }
    })
  }

  obtenerAgregadosDisponibles()
  {
    this.productosService.obtenerAgregados().subscribe({
      next: (agregados) => 
        {
          this.agregadosDisponibles.set(agregados);
        }
    })
  }

  agregarProducto()
  {
    //aca se crea el ProductoSeleccionado

    if(this.productoActual != null)
    {
      this.productosSeleccionados.update(lista => [...lista, this.productoActual]);
    }
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
    this.pedidosService.agregarPedido(this.nuevoPedido!).subscribe();;
  }
     
}