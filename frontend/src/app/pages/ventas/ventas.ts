import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrearPedidoDTO } from '../../services/pedidos/dto/crearPedidoPost.dto';
import { PedidoResponseVentas } from '../../services/pedidos/dto/PedidoResponseVentas.dto';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { ProductoConPrecioResponseDTO } from '../../services/productos/dto/ProductoConPrecioResponse';
import { AgregadoDBDTO } from '../../services/productos/dto/agregadoDB.dto';
import { ProductosService } from '../../services/productos/productos-service';
import { Usuario } from '../../../interfaces/usuario';

interface ProductoCarrito {
  idProducto: number;
  nombre: string;
  descripcion: string;
  cantidad: number;
  cuotas: number;
  valorSenia: number;
  valorCuota: number;
  beneficio: string;
  agregados: number[];
}

@Component({
  selector: 'app-ventas',
  imports: [FormsModule, CurrencyPipe],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
export class Ventas implements OnInit {
  private readonly pedidosService = inject(PedidosService);
  private readonly productosService = inject(ProductosService);

  readonly ventas = signal<PedidoResponseVentas[]>([]);
  readonly productosDisponibles = signal<ProductoConPrecioResponseDTO[]>([]);
  readonly agregadosDisponibles = signal<AgregadoDBDTO[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly vistaFormulario = signal(false);
  readonly paso = signal(1);
  readonly carrito = signal<ProductoCarrito[]>([]);
  readonly productoCalculado = signal<ProductoCarrito | null>(null);
  readonly ventasExpandidas = signal<number[]>([]);
  readonly pedidosExpandidos = signal<number[]>([]);

  readonly anioActual = new Date().getFullYear();
  banderaSeleccionada = false;

  colegio = this.crearColegio();
  grupo = this.crearGrupo();
  alumnosResponsables = [this.crearAlumno(), this.crearAlumno()];
  padresResponsables = [this.crearPadre(true), this.crearPadre(false)];
  productoEnEdicion = this.crearProductoEnEdicion();
  detallePedido = this.crearDetallePedido();
  pago = { fechaSenia: '', fechaPrimeraCuota: '' };

  readonly ventasPorPromo = computed(() =>
    [this.anioActual, this.anioActual + 1].map((promo) => ({
      promo,
      ventas: this.ventas().filter((venta) => venta.grupoDTO.promo === promo),
    })),
  );

  readonly productosParaElegir = computed(() => {
    const vistos = new Set<number>();
    return this.productosDisponibles().filter((producto) => {
      if (vistos.has(producto.id_producto)) return false;
      vistos.add(producto.id_producto);
      return true;
    });
  });

  readonly agregadosIndividuales = computed(() =>
    this.agregadosDisponibles().filter((agregado) => agregado.individual),
  );

  readonly bandera = computed(() =>
    this.agregadosDisponibles().find((agregado) => !agregado.individual) ?? null,
  );

  ngOnInit(): void {
    this.obtenerVentas();
    this.obtenerProductos();
    this.obtenerAgregados();
  }

  abrirFormulario(): void {
    this.error.set('');
    this.vistaFormulario.set(true);
    this.paso.set(1);
  }

  cerrarFormulario(): void {
    this.vistaFormulario.set(false);
    this.error.set('');
    this.resetearFormulario();
  }

  irAPaso(numero: number): void {
    if (numero < this.paso() || this.validarHasta(numero - 1)) this.paso.set(numero);
  }

  siguientePaso(): void {
    if (!this.validarPaso()) return;
    this.paso.update((paso) => Math.min(6, paso + 1));
  }

  anteriorPaso(): void {
    this.paso.update((paso) => Math.max(1, paso - 1));
  }

  toggleVenta(idGrupo: number): void {
    this.ventasExpandidas.update((ids) => this.alternarId(ids, idGrupo));
  }

  estaVentaExpandida(idGrupo: number): boolean {
    return this.ventasExpandidas().includes(idGrupo);
  }

  togglePedido(idGrupo: number): void {
    this.pedidosExpandidos.update((ids) => this.alternarId(ids, idGrupo));
  }

  estaPedidoExpandido(idGrupo: number): boolean {
    return this.pedidosExpandidos().includes(idGrupo);
  }

  nombreProducto(idProducto: number): string {
    return this.productosDisponibles().find(
      (producto) => producto.id_producto === idProducto,
    )?.nombre ?? 'Producto no encontrado';
  }

  totalSeniaVenta(venta: PedidoResponseVentas): number {
    return venta.productosPedidoDTO.reduce(
      (total, producto) => total + producto.valor_senia * producto.cantidad,
      0,
    );
  }

  totalCuotaVenta(venta: PedidoResponseVentas): number {
    return venta.productosPedidoDTO.reduce(
      (total, producto) => total + producto.valor_cuota * producto.cantidad,
      0,
    );
  }

  idProducto(producto: ProductoConPrecioResponseDTO): number {
    return producto.id_producto;
  }

  cambiarAgregado(idAgregado: number, seleccionado: boolean): void {
    this.productoEnEdicion.agregados = seleccionado
      ? [...this.productoEnEdicion.agregados, idAgregado]
      : this.productoEnEdicion.agregados.filter((id) => id !== idAgregado);
    this.calcularProducto();
  }

  calcularProducto(): void {
    const { idProducto, cantidad, cuotas, agregados } = this.productoEnEdicion;
    if (!idProducto || !cantidad || !cuotas) {
      this.productoCalculado.set(null);
      return;
    }

    this.productosService.obtenerPrecioBeneficioProducto(idProducto, cuotas, cantidad).subscribe({
      next: (precio) => {
        const producto = this.productosParaElegir().find(
          (item) => item.id_producto === idProducto,
        );
        const extras = this.agregadosIndividuales().filter((item) => agregados.includes(item.id));
        const costoExtras = extras.reduce((total, item) => total + item.precio, 0);
        this.productoCalculado.set({
          idProducto,
          nombre: producto?.nombre ?? 'Producto',
          descripcion: [producto?.descripcion, ...extras.map((item) => item.agregado)]
            .filter(Boolean)
            .join(' · '),
          cantidad,
          cuotas,
          valorSenia: precio.valor_senia,
          valorCuota: precio.valor_cuota + costoExtras / cuotas,
          beneficio: precio.beneficio ?? '',
          agregados,
        });
      },
      error: () => {
        this.productoCalculado.set(null);
        this.error.set('No se pudo calcular el precio del producto seleccionado.');
      },
    });
  }

  agregarProductoAlCarrito(): void {
    const producto = this.productoCalculado();
    if (!producto) return;
    this.carrito.update((carrito) => [...carrito, producto]);
    this.productoEnEdicion = this.crearProductoEnEdicion();
    this.productoCalculado.set(null);
  }

  quitarProducto(indice: number): void {
    this.carrito.update((carrito) => carrito.filter((_, index) => index !== indice));
  }

  totalSenia(): number {
    return this.carrito().reduce(
      (total, producto) => total + producto.valorSenia * producto.cantidad,
      0,
    );
  }

  descuentoCuotas(): number {
    const porcentaje = Number(this.detallePedido.porcentaje_descuento_hermanos) || 0;
    const hermanos = Number(this.detallePedido.cantidad_hermanos) || 0;
    return this.totalCuotasSinDescuento() * (porcentaje / 100) * hermanos;
  }

  totalCuotas(): number {
    return this.totalCuotasSinDescuento() - this.descuentoCuotas();
  }

  cuotaPorAlumno(): number {
    const cantidad = Number(this.grupo.cantidad_egresados) || 0;
    return cantidad ? this.totalCuotas() / cantidad : 0;
  }

  actualizarFechaPrimeraCuota(): void {
    if (!this.pago.fechaSenia) return;
    const fecha = new Date(`${this.pago.fechaSenia}T00:00:00`);
    fecha.setDate(fecha.getDate() + 30);
    this.pago.fechaPrimeraCuota = fecha.toISOString().slice(0, 10);
  }

  guardarVenta(): void {
    if (!this.validarHasta(6)) return;
    const usuario = this.obtenerUsuario();
    if (!usuario) {
      this.error.set('No se encontró la sesión de la vendedora. Volvé a iniciar sesión.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.pedidosService.agregarPedido(this.crearPedido(usuario)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.obtenerVentas();
      },
      error: () => {
        this.guardando.set(false);
        this.error.set('No se pudo guardar la venta. Intentá nuevamente.');
      },
    });
  }

  private obtenerVentas(): void {
    this.cargando.set(true);
    this.pedidosService.obtenerPedidos().subscribe({
      next: (ventas) => {
        this.ventas.set(ventas);
        console.log("Frontend mostrando ventas:")
        console.log(ventas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las ventas.');
        this.cargando.set(false);
      },
    });
  }

  private obtenerProductos(): void {
    this.productosService.obtenerProductos().subscribe({
      next: (productos) => this.productosDisponibles.set(productos),
      error: () => this.error.set('No se pudieron cargar los productos.'),
    });
  }

  private obtenerAgregados(): void {
    this.productosService.obtenerAgregados().subscribe({
      next: (agregados) => this.agregadosDisponibles.set(agregados),
      error: () => this.error.set('No se pudieron cargar los agregados.'),
    });
  }

  private validarPaso(): boolean {
    return this.validarHasta(this.paso());
  }

  private validarHasta(paso: number): boolean {
    const validadores: Record<number, () => boolean> = {
      1: () => Boolean(this.colegio.nombre && this.colegio.localidad && this.colegio.provincia && this.grupo.orientacion && this.grupo.turno && this.grupo.nivel && Number(this.grupo.cantidad_egresados) > 0),
      2: () => this.alumnosResponsables.every((alumno) => Boolean(alumno.nombre && alumno.apellido && alumno.telefono)),
      3: () => this.padresResponsables.every((padre, indice) => Boolean(padre.nombre && padre.apellido && padre.telefono && padre.dni && (indice || padre.mail))),
      4: () => this.carrito().length > 0,
      5: () => Boolean(this.detallePedido.buzo_campera && this.detallePedido.chomba_remera && this.detallePedido.talles),
      6: () => Boolean(this.pago.fechaSenia && this.pago.fechaPrimeraCuota),
    };
    for (let indice = 1; indice <= paso; indice += 1) {
      if (!validadores[indice]()) {
        this.error.set(`Completá los campos requeridos del paso ${indice}.`);
        return false;
      }
    }
    this.error.set('');
    return true;
  }

  private crearPedido(usuario: Usuario): CrearPedidoDTO {
    const documentos = [{ tipo: 'seña', archivo_url: 'pendiente-storage' }];
    if (this.detallePedido.recursoAdicional) {
      documentos.push({ tipo: 'recurso adicional', archivo_url: 'pendiente-storage' });
    }
    return {
      colegioDTO: { ...this.colegio },
      grupoDTO: { ...this.grupo, id_colegio: 0, cantidad_egresados: Number(this.grupo.cantidad_egresados) },
      pedidoDTO: {
        id_grupo: 0,
        id_vendedora: usuario.id,
        id_diseñadora: 0,
        talles: this.detallePedido.talles,
        envio_gratis: this.detallePedido.envio_gratis,
        seña: 'pendiente-storage',
        observaciones: this.detallePedido.observaciones,
        estado_general: 'Venta realizada',
        fecha_aprobacion_boceto: null,
        fecha_aprobacion_talles: null,
        colores: this.detallePedido.colores,
        cantidad_hermanos: Number(this.detallePedido.cantidad_hermanos) || 0,
        porcentaje_descuento_hermanos: Number(this.detallePedido.porcentaje_descuento_hermanos) || 0,
        buzo_campera: this.detallePedido.buzo_campera,
        chomba_remera: this.detallePedido.chomba_remera,
        estado_talles: '',
        estado_boceto: '',
        recursos_adicionales: this.detallePedido.recursoAdicional ? ['pendiente-storage'] : [],
      },
      productosPedidoDTO: this.carrito().map((producto) => ({
        id_pedido: 0,
        id_producto_original: producto.idProducto,
        descripcion: producto.descripcion,
        beneficio: producto.beneficio,
        valor_senia: producto.valorSenia,
        valor_cuota: producto.valorCuota,
        cantidad: producto.cantidad,
      })),
      padresResponsablesDTO: this.padresResponsables.map((padre) => ({ ...padre, id_grupo: 0 })),
      alumnosResponsablesDTO: this.alumnosResponsables.map((alumno) => ({ ...alumno, id_grupo: 0 })),
      pagoDTO: { id_pedido: 0, nro_transferencia: '', tipo_pago: 'Seña', monto: this.totalSenia(), motivo: 'Seña', fecha: new Date(`${this.pago.fechaSenia}T00:00:00`) },
      movimientoDTO: { id_grupo: 0, importe: this.totalSenia(), fecha: this.pago.fechaSenia },
      documentoDTO: documentos,
      primerCuota: { id_pedido: 0, numero: 1, fecha_vencimiento: new Date(`${this.pago.fechaPrimeraCuota}T00:00:00`), importe: this.totalCuotas() },
      nroCuotas: this.carrito()[0]?.cuotas ?? 0,
    };
  }

  private totalCuotasSinDescuento(): number {
    const productos = this.carrito().reduce(
      (total, producto) => total + producto.valorCuota * producto.cantidad,
      0,
    );
    return productos + (this.banderaSeleccionada ? this.bandera()?.precio ?? 0 : 0);
  }

  private obtenerUsuario(): Usuario | null {
    try {
      const guardado = localStorage.getItem('usuario');
      return guardado ? (JSON.parse(guardado) as Usuario) : null;
    } catch {
      return null;
    }
  }

  private resetearFormulario(): void {
    this.colegio = this.crearColegio();
    this.grupo = this.crearGrupo();
    this.alumnosResponsables = [this.crearAlumno(), this.crearAlumno()];
    this.padresResponsables = [this.crearPadre(true), this.crearPadre(false)];
    this.productoEnEdicion = this.crearProductoEnEdicion();
    this.detallePedido = this.crearDetallePedido();
    this.pago = { fechaSenia: '', fechaPrimeraCuota: '' };
    this.carrito.set([]);
    this.productoCalculado.set(null);
    this.banderaSeleccionada = false;
  }

  private alternarId(ids: number[], id: number): number[] {
    return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
  }

  private crearColegio() {
    return { nombre: '', localidad: '', provincia: '' };
  }

  private crearGrupo() {
    return { promo: this.anioActual, orientacion: '', turno: '', nivel: '', cantidad_egresados: 0 };
  }

  private crearAlumno() {
    return { nombre: '', apellido: '', telefono: '' };
  }

  private crearPadre(incluyeMail: boolean) {
    return { nombre: '', apellido: '', telefono: '', dni: '', mail: incluyeMail ? '' : '' };
  }

  private crearProductoEnEdicion() {
    return { idProducto: 0, cantidad: 0, cuotas: 0, agregados: [] as number[] };
  }

  private crearDetallePedido() {
    return { buzo_campera: '', chomba_remera: '', talles: '', colores: '', cantidad_hermanos: 0, porcentaje_descuento_hermanos: 0, envio_gratis: false, recursoAdicional: false, observaciones: '' };
  }
}
