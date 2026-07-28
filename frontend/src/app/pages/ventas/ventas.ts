import { Component, inject, signal, effect, computed, OnInit} from '@angular/core';
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
import { ColegioDTO } from '../../services/pedidos/dto/Colegio.dto';
import { GrupoDTO } from '../../services/pedidos/dto/grupo.dto';
import { PedidoDTO } from '../../services/pedidos/dto/pedido.dto';
import { PagoDTO } from '../../services/pedidos/dto/pago.dto';
import { MovimientoDTO } from '../../services/pedidos/dto/movimiento.dto';
import { CuotaInicioVentaDTO } from '../../services/pedidos/dto/cuotaInicioVenta.dto';


@Component({
  selector: 'app-ventas',
  imports: [],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
export class Ventas implements OnInit {

  private pedidosService = inject(PedidosService);
  private productosService = inject(ProductosService);

  ventas = signal<PedidoResponseVentas[]>([]);
  productosDisponibles = signal<ProductoConPrecioResponseDTO[]>([]);
  agregadosDisponibles = signal<AgregadoDBDTO[]>([]);

  cargando = signal(false);

  ngOnInit(): void {
    this.obtenerVentas();
    this.obtenerProductos();
    this.obtenerAgregados();
  }

  obtenerVentas() {
    //usa this.pedidosService.obtenerPedidos();
  }

  obtenerProductos() {
    //usa this.productosService.obtenerProductos()
  }

  obtenerAgregados() {
    //usa this.productosService.obtenerAgregados()
  }

  agregarVenta(dto: CrearPedidoDTO) {
    return this.pedidosService.agregarPedido(dto);
  }

}