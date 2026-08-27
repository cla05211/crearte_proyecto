import { Component, computed, DestroyRef, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { CrearPedidoDTO } from '../../services/gestionPedidos/dto/crearPedidoPost.dto';
import { PedidoResponseVentas } from '../../services/gestionPedidos/dto/PedidoResponseVentas.dto';
import { GestionPedidosService } from '../../services/gestionPedidos/gestion-pedidos-service';
import { ProductoConPrecioResponseDTO } from '../../services/productos/dto/ProductoConPrecioResponse';
import { AgregadoDBDTO } from '../../services/productos/dto/agregadoDB.dto';
import { ProductosService } from '../../services/productos/productos-service';
import { Usuario } from '../../../interfaces/usuario';
import { BuscadorSelect } from '../../shared/buscador-select/buscador-select';
import { faL } from '@fortawesome/free-solid-svg-icons';
import { NotificationService } from '../../shared/notifications/notification.service';
import { DocumentoDTO } from '../../services/gestionPedidos/dto/documento.dto';
import { PagoDTO } from '../../services/gestionPedidos/dto/pago.dto';
import { StorageService } from '../../services/storage/storage-service';
import { ModificarBeneficioDto } from '../../services/gestionPedidos/dto/modficaciones/modficiarBeneficio.dto';
import { ProductosPedidoService } from '../../services/productosPedidos/productos-pedido-service';
import { ProductoPedidoDTO } from '../../services/gestionPedidos/dto/ProductoPedido.dto';
import { ModificarPlanPedidoDTO } from '../../services/gestionPedidos/dto/modficaciones/ModificarPlanPedido';
import { CuotasService } from '../../services/cuotas/cuotas-service';
import { CuotaResponseDTO } from '../../services/cuotas/dto/CuotaResponseDTO';
import { CrearCuotasDTO } from '../../services/cuotas/dto/crearCuotas.dto';
import { PagosService } from '../../services/pagos/pagos-service';
import { PagoResponseDTO } from '../../services/pagos/dto/pagoResponse.dto';
import { PagoComprobanteDatosDTO } from '../../services/pagos/dto/pagoComprobanteDatos.dto';

interface ProductoCarrito {
  idProducto: number;
  nombre: string;
  descripcion: string;
  cantidad: number;
  cuotas: number;
  valorSenia: number;
  valorCuota: number;
  agregados: number[];
}

interface BeneficioSeleccionado {
  nombre: string;
  cantidad: number;
}

interface PaginaVentas {
  ventas: PedidoResponseVentas[];
  pagina: number;
  hayMasPaginas: boolean;
}

interface ComprobanteVerificado {
  datos: PagoComprobanteDatosDTO | null;
  verificando: boolean;
  error: string;
  entidadPago: string;
  requiereIngresoManual: boolean;
  manualNroTransferencia: string;
  manualMonto: number | null;
  manualBanco: string;
  entidadPagoPersonalizada: boolean;
}

@Component({
  selector: 'app-ventas',
  imports: [FormsModule, CurrencyPipe, BuscadorSelect],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
})
export class Ventas implements OnInit {
  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly productosService = inject(ProductosService);
  private readonly notificaciones = inject(NotificationService);
  private readonly storageService = inject(StorageService);
  private readonly cuotasService = inject(CuotasService);
  private readonly productosPedidosService = inject(ProductosPedidoService);
  private readonly pagosService = inject(PagosService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('archivoSeniaInput') private archivoSeniaInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('recursosAdicionalesInput') private recursosAdicionalesInputRef?: ElementRef<HTMLInputElement>;

  archivosSenia: File[] = [];
  archivosRecursosAdicionales: File[] = [];

  readonly comprobantesSenia = signal<ComprobanteVerificado[]>([]);

  //Opciones
  orientaciones = ["Sociales", "Naturales", "Arte", "Economía", "Técnica", "Teatro", "Educación física",
    "Administración de empresas", "Turismo", "Electromecánica", "Maestro mayor de obras", "Comunicación", 
    "Industrial", "Informática", "Contabilidad", "Humanidades", "Mecánica", "Química", "Lenguas extranjeras", 
    "Idiomas", "Audiovisual", "Agro", "Programación", "Música", "Literatura", "Educación social", "Artística", 
    "Humanístico", "Pedagogía", "Bachiller", "-"];
  turnos = ["Mañana", "Tarde", "Noche", "Doble", "Vespertino"];
  provincias = ["Buenos Aires","Catamarca","Chaco","Chubut","Córdoba","Corrientes","Entre Ríos",
    "Formosa","Jujuy","La Pampa","La Rioja","Mendoza","Misiones","Neuquén","Río Negro","Salta",
    "San Juan","San Luis","Santa Cruz","Santa Fe","Santiago del Estero","Tierra del Fuego","Tucumán",
    "Ciudad Autónoma de Buenos Aires"];  
  niveles = ["Secundaria", "Primaria", "Jardin"];
  entidadesPago = ["Mercado Pago", "NaranjaX", "Cuenta DNI", "Galicia", "BNA", "Uala","Santander","Macro", "Otra"];
  bancosComprobante = ["COMAFI", "Santander"];

  readonly TAMANIO_PAGINA = 10;
  readonly paginasPorPromo = signal<Record<number, PaginaVentas>>({});
  readonly cargandoPorPromo = signal<Record<number, boolean>>({});
  private readonly solicitudPaginaPorPromo = new Map<number, Subject<number>>();
  private readonly busquedaCambiada$ = new Subject<string>();

  readonly productosDisponibles = signal<ProductoConPrecioResponseDTO[]>([]);
  readonly agregadosDisponibles = signal<AgregadoDBDTO[]>([]);
  readonly beneficiosDisponibles = signal<string[]>([]);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly vistaFormulario = signal(false);
  readonly paso = signal(1);
  readonly carrito = signal<ProductoCarrito[]>([]);
  readonly beneficiosSeleccionados = signal<BeneficioSeleccionado[]>([]);
  readonly productoCalculado = signal<ProductoCarrito | null>(null);
  readonly ventasExpandidas = signal<number[]>([]);
  readonly detalleProductosVenta = signal<PedidoResponseVentas | null>(null);
  cuotasDisponibles = signal<number[]>([]);

  readonly anioActual = new Date().getFullYear();
  readonly promoSeleccionada = signal(this.anioActual);
  readonly busqueda = signal('');
  readonly busquedaInput = signal('');
  banderaSeleccionada = false;

  colegio = this.crearColegio();
  grupo = this.crearGrupo();
  alumnosResponsables = [this.crearAlumno(), this.crearAlumno()];
  padresResponsables = [this.crearPadre(true), this.crearPadre(false), this.crearPadre(false)];
  productoEnEdicion = this.crearProductoEnEdicion();
  beneficioEnEdicion = this.crearBeneficioEnEdicion();
  detallePedido = this.crearDetallePedido();
  pago = this.crearPago();
  cuotasPedido: CuotaResponseDTO[] = [];

  //Para editar
  editando = signal<boolean>(false);

  //Edición de beneficio
  readonly edicionBeneficio = signal<PedidoResponseVentas | null>(null);
  readonly beneficiosSeleccionadosEdicion = signal<BeneficioSeleccionado[]>([]);
  readonly guardandoBeneficio = signal(false);
  beneficioEnEdicionForm = this.crearBeneficioEnEdicion();

  //Edición de plan (productos y cuotas)
  readonly edicionPlan = signal<PedidoResponseVentas | null>(null);
  readonly carritoEdicionPlan = signal<ProductoCarrito[]>([]);
  readonly cuotasPlanSeleccionadas = signal<number>(0);
  readonly productoCalculadoPlan = signal<ProductoCarrito | null>(null);
  readonly guardandoPlan = signal(false);
  readonly indiceEdicionProductoPlan = signal<number | null>(null);
  productoEnEdicionPlan = this.crearProductoEnEdicionPlan();
  banderaSeleccionadaPlan = false;

  readonly datosPromoActual = computed<PaginaVentas>(
    () => this.paginasPorPromo()[this.promoSeleccionada()] ?? { ventas: [], pagina: 0, hayMasPaginas: false },
  );

  readonly cargandoPromoActual = computed(
    () => this.cargandoPorPromo()[this.promoSeleccionada()] ?? false,
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
    this.inicializarPipelineVentas(this.anioActual);
    this.inicializarPipelineVentas(this.anioActual + 1);
    this.inicializarBusquedaConDebounce();
    this.recargarVentasDesdeInicio();
    this.obtenerProductos();
    this.obtenerAgregados();
    this.obtenerNroCuotasDispoinibles();
    this.obtenerBeneficios();
  }

  private inicializarPipelineVentas(promo: number): void {
    const solicitudes$ = new Subject<number>();
    this.solicitudPaginaPorPromo.set(promo, solicitudes$);

    solicitudes$
      .pipe(
        switchMap((pagina) => {
          this.cargandoPorPromo.update((actual) => ({ ...actual, [promo]: true }));
          const desde = pagina * this.TAMANIO_PAGINA;
          const hasta = desde + this.TAMANIO_PAGINA - 1;
          const busqueda = this.busqueda().trim() || undefined;

          return this.gestionPedidosService.obtenerPedidos(desde, hasta, busqueda, promo).pipe(
            map((ventas) => ({ pagina, ventas })),
            catchError(() => {
              this.cargandoPorPromo.update((actual) => ({ ...actual, [promo]: false }));
              this.error.set('No se pudieron cargar las ventas.');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        if (!resultado) return;
        const { pagina, ventas } = resultado;
        this.paginasPorPromo.update((actual) => {
          if (ventas.length === 0 && pagina > 0) {
            const anterior = actual[promo];
            return anterior ? { ...actual, [promo]: { ...anterior, hayMasPaginas: false } } : actual;
          }
          return {
            ...actual,
            [promo]: { ventas, pagina, hayMasPaginas: ventas.length === this.TAMANIO_PAGINA },
          };
        });
        this.cargandoPorPromo.update((actual) => ({ ...actual, [promo]: false }));
      });
  }

  private inicializarBusquedaConDebounce(): void {
    this.busquedaCambiada$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => {
        this.busqueda.set(valor.trim());
        this.solicitarPagina(this.anioActual, 0);
        this.solicitarPagina(this.anioActual + 1, 0);
      });
  }

  actualizarBusqueda(valor: string): void {
    this.busquedaInput.set(valor);
    this.busquedaCambiada$.next(valor);
  }

  private solicitarPagina(promo: number, pagina: number): void {
    this.solicitudPaginaPorPromo.get(promo)?.next(pagina);
  }

  paginaAnterior(): void {
    const promo = this.promoSeleccionada();
    const actual = this.paginasPorPromo()[promo];
    if (!actual || actual.pagina === 0) return;
    this.solicitarPagina(promo, actual.pagina - 1);
  }

  paginaSiguiente(): void {
    const promo = this.promoSeleccionada();
    const actual = this.paginasPorPromo()[promo];
    if (!actual || !actual.hayMasPaginas) return;
    this.solicitarPagina(promo, actual.pagina + 1);
  }

  private recargarVentasDesdeInicio(): void {
    this.solicitarPagina(this.anioActual, 0);
    this.solicitarPagina(this.anioActual + 1, 0);
  }

  private recargarPaginaActual(): void {
    const promo = this.promoSeleccionada();
    const pagina = this.paginasPorPromo()[promo]?.pagina ?? 0;
    this.solicitarPagina(promo, pagina);
  }

  abrirFormulario(): void {
    this.error.set('');
    this.vistaFormulario.set(true);
    this.paso.set(1);
  }

  obtenerNroCuotasDispoinibles()
  {
    //ACA
    this.productosService.obtenerCuotasDisponibles().subscribe({
      next: (cuotas) => {
        this.cuotasDisponibles.set(cuotas);}});
  }

  cerrarFormulario(): void {
    this.vistaFormulario.set(false);
    this.error.set('');
    this.resetearFormulario();
  }

  irAPaso(numero: number): void {
    if (this.paso() == 1 && this.grupo.nivel != "Secundaria")
    {
      this.paso.set(3);
    }
    else if (numero < this.paso() || this.validarHasta(numero - 1)) this.paso.set(numero);
  }

  siguientePaso(): void 
  {
    if (!this.validarPaso()) return;
    
    this.paso.update((paso) => {
      if (paso === 1 && this.grupo.nivel !== 'Secundaria') 
      {
        return 3;
      }
      return Math.min(6, paso + 1)});
  }

  anteriorPaso(): void {
    this.paso.update((paso) => {
      if (paso === 3 && this.grupo.nivel !== 'Secundaria') 
      {
        return 1;
      }
      return Math.max(1, paso - 1)});
  }

  toggleVenta(idGrupo: number): void {
    this.ventasExpandidas.update((ids) => this.alternarId(ids, idGrupo));
  }

  estaVentaExpandida(idGrupo: number): boolean {
    return this.ventasExpandidas().includes(idGrupo);
  }

  abrirDetalleProductos(venta: PedidoResponseVentas): void {
    this.detalleProductosVenta.set(venta);
  }

  cerrarDetalleProductos(): void {
    this.detalleProductosVenta.set(null);
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

  cambiarBandera(seleccionado: boolean): void {
    this.banderaSeleccionada = seleccionado;
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
        const nombresExtras = extras.map((item) => item.agregado);
        if (this.banderaSeleccionada && this.bandera()) {
          nombresExtras.push(this.bandera()!.agregado);
        }
        this.productoCalculado.set({
          idProducto,
          nombre: producto?.nombre ?? 'Producto',
          descripcion: [producto?.descripcion, ...nombresExtras]
            .filter(Boolean)
            .join(' · Agregado: '),
          cantidad,
          cuotas,
          valorSenia: precio.valor_senia,
          valorCuota: precio.valor_cuota + costoExtras / cuotas,
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

  agregarBeneficio(): void {
    const nombre = this.beneficioEnEdicion.nombre;
    const cantidad = Number(this.beneficioEnEdicion.cantidad);
    if (!nombre || cantidad < 1) return;

    this.beneficiosSeleccionados.update((beneficios) => {
      const indice = beneficios.findIndex((beneficio) => beneficio.nombre === nombre);
      if (indice === -1) return [...beneficios, { nombre, cantidad }];

      return beneficios.map((beneficio, i) =>
        i === indice ? { ...beneficio, cantidad: beneficio.cantidad + cantidad } : beneficio,
      );
    });
    this.beneficioEnEdicion = this.crearBeneficioEnEdicion();
  }

  quitarBeneficio(indice: number): void {
    this.beneficiosSeleccionados.update((beneficios) =>
      beneficios.filter((_, i) => i !== indice),
    );
  }

  textoBeneficios(): string {
    return this.beneficiosSeleccionados()
      .map((beneficio) => `${beneficio.cantidad} ${beneficio.nombre}`)
      .join(' - ');
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

  seleccionarArchivosSenia(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const nuevosArchivos = Array.from(input.files);
    const indiceInicial = this.archivosSenia.length;
    this.archivosSenia = [...this.archivosSenia, ...nuevosArchivos];
    this.comprobantesSenia.update((comprobantes) => [
      ...comprobantes,
      ...nuevosArchivos.map(() => ({
        datos: null,
        verificando: true,
        error: '',
        entidadPago: '',
        requiereIngresoManual: false,
        manualNroTransferencia: '',
        manualMonto: null,
        manualBanco: '',
        entidadPagoPersonalizada: false,
      })),
    ]);

    input.value = '';
    nuevosArchivos.forEach((archivo, offset) =>
      this.verificarComprobante(archivo, indiceInicial + offset),
    );
  }

  seleccionarRecursosAdicionales(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const nuevosArchivos = Array.from(input.files);
    this.archivosRecursosAdicionales = [...this.archivosRecursosAdicionales, ...nuevosArchivos];

    input.value = '';
  }

  quitarArchivoSenia(indice: number): void {
    this.archivosSenia = this.archivosSenia.filter((_, index) => index !== indice);
    this.comprobantesSenia.update((comprobantes) =>
      comprobantes.filter((_, index) => index !== indice),
    );
  }

  private verificarComprobante(archivo: File, indice: number): void {
    const formData = new FormData();
    formData.append('comprobante', archivo, archivo.name);

    this.pagosService.comprobarDatosComprobante(formData).subscribe({
      next: (datos) => {
        this.comprobantesSenia.update((comprobantes) =>
          comprobantes.map((c, i) => (i === indice ? { ...c, datos, verificando: false, error: '' } : c)),
        );
      },
      error: () => {
        this.comprobantesSenia.update((comprobantes) =>
          comprobantes.map((c, i) =>
            i === indice
              ? {
                  ...c,
                  datos: null,
                  verificando: false,
                  error: 'No se pudieron extraer los datos del comprobante. Verificá el archivo e intentá nuevamente, o ingresá los datos manualmente.',
                  requiereIngresoManual: true,
                }
              : c,
          ),
        );
      },
    });
  }

  actualizarEntidadComprobante(indice: number, entidadPago: string): void {
    this.comprobantesSenia.update((comprobantes) =>
      comprobantes.map((c, i) => {
        if (i !== indice) return c;
        if (entidadPago === 'Otra') {
          return { ...c, entidadPagoPersonalizada: true, entidadPago: '' };
        }
        return { ...c, entidadPagoPersonalizada: false, entidadPago };
      }),
    );
  }

  actualizarEntidadPagoPersonalizada(indice: number, entidadPago: string): void {
    this.comprobantesSenia.update((comprobantes) =>
      comprobantes.map((c, i) => (i === indice ? { ...c, entidadPago } : c)),
    );
  }

  actualizarDatoManualComprobante(
    indice: number,
    campo: 'nro_transferencia' | 'monto' | 'banco',
    valor: string,
  ): void {
    this.comprobantesSenia.update((comprobantes) =>
      comprobantes.map((c, i) => {
        if (i !== indice) return c;

        const actualizado = { ...c };
        if (campo === 'nro_transferencia') actualizado.manualNroTransferencia = valor.trim();
        if (campo === 'banco') actualizado.manualBanco = valor;
        if (campo === 'monto') actualizado.manualMonto = valor === '' ? null : Number(valor);

        const completo = Boolean(
          actualizado.manualNroTransferencia &&
            actualizado.manualBanco &&
            actualizado.manualMonto &&
            actualizado.manualMonto > 0,
        );

        actualizado.datos = completo
          ? {
              nro_transferencia: actualizado.manualNroTransferencia,
              monto: actualizado.manualMonto!,
              banco: actualizado.manualBanco,
            }
          : null;
        actualizado.error = completo ? '' : c.error;

        return actualizado;
      }),
    );
  }

  quitarArchivoRecursoAdicional(indice: number): void {
    this.archivosRecursosAdicionales = this.archivosRecursosAdicionales.filter(
      (_, index) => index !== indice,
    );
  }

  guardarVenta(): void {
    if (!this.validarHasta(6)) return;
    const usuario = this.obtenerUsuario();
    if (!usuario) {
      this.notificaciones.warning({
        title: 'Sesión no encontrada',
        description: 'No se encontró la sesión de la vendedora. Volvé a iniciar sesión.',
      });
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    const idPedido = Date.now();

    this.subirArchivos(idPedido).subscribe({
      next: ({ urlsSenia, urlsRecursos }) => {
        const pedido = this.crearPedido(usuario, idPedido);
        pedido.pagosDTO = this.construirPagosDTO(idPedido, urlsSenia);
        const recursos = this.construirDocumentosRecursos(urlsRecursos);
        if (recursos.length) pedido.documentoDTO = recursos;

        this.gestionPedidosService.agregarPedido(pedido).subscribe({
          next: () => {
            this.guardando.set(false);
            this.notificaciones.success({
              title: 'Venta guardada',
              description: 'La venta se registró correctamente.',
            });
            this.cerrarFormulario();
            this.recargarVentasDesdeInicio();
          },
          error: (err: HttpErrorResponse) => {
            this.guardando.set(false);
            this.notificarErrorGuardado(err);
          },
        });
      },
      error: () => {
        this.guardando.set(false);
        this.notificaciones.error({
          title: 'Error al subir archivos',
          description: 'No se pudieron subir los archivos adjuntos. Intentá nuevamente.',
        });
      },
    });
  }

  private subirArchivos(idPedido: number): Observable<{ urlsSenia: string[]; urlsRecursos: string[] }> {

    const subidasSenia= this.archivosSenia.map((archivo, index) =>
      this.storageService.subirImagen({
        archivo,
        nombreArchivo:  `senia-${index + 1}-${this.colegio.nombre}-${Date.now()}-${archivo.name}`        
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-'),
        carpetaGuardado: "senias"
      }).pipe(
        map(({ ruta }) => ruta),
        catchError((err) => {
          console.error(`Error subiendo recurso ${index + 1}:`, err);
          return of(''); 
        }),
    ));

    const subidasRecursos= this.archivosRecursosAdicionales.map((archivo, index) =>
      this.storageService.subirImagen({
        archivo,
        nombreArchivo:  `recurso-${index + 1}-${this.colegio.nombre}-${Date.now()}-${archivo.name}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-'),
        carpetaGuardado: "recursos_adicionales"
      }).pipe(
        map(({ ruta }) => ruta),
        catchError((err) => {
          console.error(`Error subiendo recurso ${index + 1}:`, err);
          return of('');
        }),
    ));

    const urlsSenia$ =subidasSenia.length > 0? forkJoin(subidasSenia): of<string[]>([]);

    const urlsRecursos$ =subidasRecursos.length > 0? forkJoin(subidasRecursos): of<string[]>([]);

    return forkJoin({urlsSenia: urlsSenia$,urlsRecursos: urlsRecursos$});
  }

  private construirDocumentosRecursos(urlsRecursos: string[]): DocumentoDTO[] {
    return urlsRecursos
      .filter((url) => url)
      .map((url) => ({ tipo: 'recurso adicional', archivo_url: url }));
  }

  private notificarErrorGuardado(err: HttpErrorResponse): void {
    const mensajeBackend: string = err?.error?.message ?? '';

    if (err.status === 0) {
      this.notificaciones.error({
        title: 'Sin conexión',
        description: 'No se pudo conectar con el servidor. Verificá tu conexión a internet.',
      });
      return;
    }

    if (err.status === 401 || err.status === 403) {
      this.notificaciones.error({
        title: 'Sesión no válida',
        description: 'No tenés permisos o tu sesión expiró. Volvé a iniciar sesión.',
      });
      return;
    }

    if (/duplicate key|unique constraint/i.test(mensajeBackend)) {
      this.notificaciones.error({
        title: 'Registro duplicado',
        description: 'Ya existe un registro con esos datos.',
      });
      return;
    }

    if (/null value.*not-null constraint/i.test(mensajeBackend)) {
      this.notificaciones.error({
        title: 'Faltan datos',
        description: 'Falta completar un campo obligatorio. Revisá el formulario e intentá nuevamente.',
      });
      return;
    }

    if (/invalid input syntax for type (date|timestamp)/i.test(mensajeBackend)) {
      this.notificaciones.error({
        title: 'Fecha inválida',
        description: 'Una de las fechas ingresadas no es válida.',
      });
      return;
    }

    if (/invalid input syntax/i.test(mensajeBackend)) {
      this.notificaciones.error({
        title: 'Datos inválidos',
        description: 'Uno de los valores ingresados no tiene un formato válido.',
      });
      return;
    }

    if (/violates foreign key constraint/i.test(mensajeBackend)) {
      this.notificaciones.error({
        title: 'Referencia inválida',
        description: 'Uno de los datos seleccionados (producto, colegio, etc.) ya no existe.',
      });
      return;
    }

    if (err.status >= 500) {
      this.notificaciones.error({
        title: 'Error del servidor',
        description: 'Ocurrió un error interno. Intentá nuevamente en unos minutos.',
      });
      return;
    }

    this.notificaciones.error({
      title: 'No se pudo guardar la venta',
      description: mensajeBackend || 'Ocurrió un error inesperado. Intentá nuevamente.',
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

    private obtenerBeneficios(): void {
    this.gestionPedidosService.obtenerBeneficios().subscribe({
      next: (beneficios) => { this.beneficiosDisponibles.set([...beneficios,"Sin beneficio"]);},
      error: () => this.error.set('No se pudieron cargar los beneficios.'),})
  }

  private validarPaso(): boolean {
    return this.validarHasta(this.paso());
  }

  private validarHasta(paso: number): boolean {
    const validadores: Record<number, () => boolean> = {
      1: () => Boolean(this.colegio.nombre && this.colegio.localidad && this.colegio.provincia && this.grupo.orientacion && this.grupo.turno && this.grupo.nivel && Number(this.grupo.cantidad_egresados) > 0),
      2: () =>this.grupo.nivel !== 'Secundaria' ||this.alumnosResponsables.every((alumno) =>Boolean(alumno.nombre && alumno.apellido && alumno.telefono)),
      3: () => this.padresResponsables.every((padre, indice) => Boolean(padre.nombre && padre.apellido && padre.telefono && padre.dni && (indice || padre.mail))),
      4: () => this.carrito().length > 0,
      5: () => Boolean(this.detallePedido.talles),
      6: () => {
        if (!this.pago.fechaSenia || !this.pago.fechaPrimeraCuota) return false;
        if (this.archivosSenia.length > 0) {
          const comprobantes = this.comprobantesSenia();
          const todosListos =
            comprobantes.length === this.archivosSenia.length &&
            comprobantes.every((c) => c.datos && !c.verificando && !c.error && c.entidadPago);
          return todosListos;
        }
        return this.pago.pagadaEfectivo;
      },
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

  private capitalizarInicial(valor: string): string {
    const limpio = valor.trim();
    return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : limpio;
  }

  private crearPedido(usuario: Usuario, idPedido: number): CrearPedidoDTO {
    return {
      colegioDTO: {
        ...this.colegio,
        nombre: this.capitalizarInicial(this.colegio.nombre),
        localidad: this.capitalizarInicial(this.colegio.localidad),
      },
      grupoDTO: { ...this.grupo, id_colegio: 0, cantidad_egresados: Number(this.grupo.cantidad_egresados) },
      pedidoDTO: {
        id_grupo: 0,
        id_vendedora: usuario.id,
        id_disenadora: 0,
        talles: this.detallePedido.talles,
        envio_gratis: this.detallePedido.envio_gratis,
        observaciones: this.capitalizarInicial(this.detallePedido.observaciones),
        estado_general: 'Venta realizada',
        fecha_aprobacion_boceto: null,
        fecha_aprobacion_talles: null,
        colores: this.capitalizarInicial(this.detallePedido.colores),
        molderias: this.capitalizarInicial(this.detallePedido.molderias),
        cantidad_hermanos: Number(this.detallePedido.cantidad_hermanos) || 0,
        porcentaje_descuento_hermanos: Number(this.detallePedido.porcentaje_descuento_hermanos) || 0,
        estado_talles: '',
        estado_boceto: '',
      },
      productosPedidoDTO: this.carrito().map((producto, indice) => ({
        id_pedido: idPedido,
        id_producto_original: producto.idProducto,
        descripcion: producto.descripcion,
        beneficio: this.beneficiosSeleccionados().length < 1 ? "Sin Beneficio" : this.textoBeneficios(),
        valor_senia: producto.valorSenia,
        valor_cuota: producto.valorCuota,
        cantidad: producto.cantidad,
      })),
      padresResponsablesDTO: this.padresResponsables.map((padre) => ({
        ...padre,
        nombre: this.capitalizarInicial(padre.nombre),
        apellido: this.capitalizarInicial(padre.apellido),
        id_grupo: 0,
      })),
      alumnosResponsablesDTO: this.alumnosResponsables[0].nombre == '' ? [] : this.alumnosResponsables.map((alumno) => ({
        ...alumno,
        nombre: this.capitalizarInicial(alumno.nombre),
        apellido: this.capitalizarInicial(alumno.apellido),
        id_grupo: 0,
      })),
      pagosDTO: [],
      movimientoDTO: { id_grupo: 0, importe: this.totalSenia(), fecha: this.pago.fechaSenia },
      primerCuota: { id_pedido: idPedido, numero: 1, fecha_vencimiento: new Date(`${this.pago.fechaPrimeraCuota}T00:00:00`), importe: this.totalCuotas() },
      nroCuotas: this.carrito()[0]?.cuotas ?? 0,
    };
  }

  private construirPagosDTO(idPedido: number, urlsSenia: string[]): PagoDTO[] {
    const fecha = new Date(`${this.pago.fechaSenia}T00:00:00`);
    const comprobantes = this.comprobantesSenia();

    if (comprobantes.length > 0) {
      return comprobantes.map((comprobante, indice) => ({
        id_pedido: idPedido,
        nro_transferencia: comprobante.datos?.nro_transferencia ?? '',
        tipo_pago: 'Seña',
        monto: comprobante.datos?.monto ?? 0,
        motivo: 'Seña',
        fecha,
        aprobado: true,
        banco: comprobante.datos?.banco ?? '',
        entidad_pago: comprobante.entidadPago,
        documentoDTO: urlsSenia[indice] ? { tipo: 'senia', archivo_url: urlsSenia[indice] } : undefined,
      }));
    }

    return [
      {
        id_pedido: idPedido,
        nro_transferencia: '',
        tipo_pago: 'Seña',
        monto: this.totalSenia(),
        motivo: 'Seña',
        fecha,
        aprobado: true,
        banco: 'Efectivo',
        entidad_pago: '',
      },
    ];
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
    this.padresResponsables = [this.crearPadre(true), this.crearPadre(false), this.crearPadre(false)];
    this.productoEnEdicion = this.crearProductoEnEdicion();
    this.detallePedido = this.crearDetallePedido();
    this.pago = this.crearPago();
    this.carrito.set([]);
    this.beneficiosSeleccionados.set([]);
    this.productoCalculado.set(null);
    this.banderaSeleccionada = false;
    this.archivosSenia = [];
    this.archivosRecursosAdicionales = [];
    this.comprobantesSenia.set([]);
    if (this.archivoSeniaInputRef) this.archivoSeniaInputRef.nativeElement.value = '';
    if (this.recursosAdicionalesInputRef) this.recursosAdicionalesInputRef.nativeElement.value = '';
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

  private crearProductoEnEdicionPlan() {
    return { idProducto: 0, cantidad: 0, agregados: [] as number[] };
  }

  private crearBeneficioEnEdicion() {
    return { nombre: '', cantidad: 1 };
  }

  private crearDetallePedido() {
    return { talles: '', colores: '',molderias: '', cantidad_hermanos: 0, porcentaje_descuento_hermanos: 0, envio_gratis: false, observaciones: '' };
  }

  private crearPago() {
    return { fechaSenia: '', fechaPrimeraCuota: '', pagadaEfectivo: false };
  }

  abrirEdicion(producto: any) 
  {
  this.editando.set(true);
  }

  guardarEdicion(nuevaSenia: number, nuevaCuota:number, nuevaDescripcion: string) 
  {
    if(this.productoCalculado() != null)
    {
      const actual = this.productoCalculado();

      if (actual != null) 
      {
        this.productoCalculado.update(producto => ({
          ...producto!,
          valorSenia: nuevaSenia,
          valorCuota: nuevaCuota,
          descripcion: nuevaDescripcion}));
          this.cancelarEdicion();
      }
    }
  }  

  cancelarEdicion() 
  {
    this.editando.set(false);
  }

  //MODIFICACIONES

  //--- Beneficio ---

  abrirEdicionBeneficio(venta: PedidoResponseVentas): void {
    this.beneficiosSeleccionadosEdicion.set(this.parsearBeneficios(venta.productosPedidoDTO[0]?.beneficio ?? ''));
    this.beneficioEnEdicionForm = this.crearBeneficioEnEdicion();
    this.edicionBeneficio.set(venta);
  }

  cerrarEdicionBeneficio(): void {
    this.edicionBeneficio.set(null);
    this.beneficiosSeleccionadosEdicion.set([]);
    this.beneficioEnEdicionForm = this.crearBeneficioEnEdicion();
  }

  agregarBeneficioEdicion(): void {
    const nombre = this.beneficioEnEdicionForm.nombre;
    const cantidad = Number(this.beneficioEnEdicionForm.cantidad);
    if (!nombre || cantidad < 1) return;

    this.beneficiosSeleccionadosEdicion.update((beneficios) => {
      const indice = beneficios.findIndex((beneficio) => beneficio.nombre === nombre);
      if (indice === -1) return [...beneficios, { nombre, cantidad }];

      return beneficios.map((beneficio, i) =>
        i === indice ? { ...beneficio, cantidad: beneficio.cantidad + cantidad } : beneficio,
      );
    });
    this.beneficioEnEdicionForm = this.crearBeneficioEnEdicion();
  }

  quitarBeneficioEdicion(indice: number): void {
    this.beneficiosSeleccionadosEdicion.update((beneficios) =>
      beneficios.filter((_, i) => i !== indice),
    );
  }

  textoBeneficiosEdicion(): string {
    if (!this.beneficiosSeleccionadosEdicion().length) return 'Sin Beneficio';
    return this.beneficiosSeleccionadosEdicion()
      .map((beneficio) => `${beneficio.cantidad} ${beneficio.nombre}`)
      .join(' - ');
  }

  guardarEdicionBeneficio(): void {
    const venta = this.edicionBeneficio();
    const idPedido = venta?.productosPedidoDTO[0]?.id_pedido;
    if (!venta || !idPedido) return;

    const dto: ModificarBeneficioDto = { beneficio: this.textoBeneficiosEdicion() };

    this.guardandoBeneficio.set(true);
    this.gestionPedidosService.modificarBeneficio(dto, idPedido).subscribe({
      next: () => {
        this.guardandoBeneficio.set(false);
        this.notificaciones.success({
          title: 'Beneficio actualizado',
          description: 'El beneficio del pedido se modificó correctamente.',
        });
        this.cerrarEdicionBeneficio();
        this.recargarPaginaActual();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoBeneficio.set(false);
        this.notificarErrorGuardado(err);
      },
    });
  }

  private parsearBeneficios(texto: string): BeneficioSeleccionado[] {
    if (!texto || texto.trim().toLowerCase() === 'sin beneficio') return [];

    return texto
      .split(' - ')
      .map((parte) => parte.trim())
      .filter(Boolean)
      .map((parte) => {
        const coincidencia = parte.match(/^(\d+)\s+(.+)$/);
        return coincidencia
          ? { cantidad: Number(coincidencia[1]), nombre: coincidencia[2] }
          : { cantidad: 1, nombre: parte };
      });
  }

  //--- Productos y plan de cuotas ---

  abrirEdicionPlan(venta: PedidoResponseVentas): void {
    const cuotas = venta.nroCuotas;
    this.carritoEdicionPlan.set(
      venta.productosPedidoDTO.map((producto) => this.productoPedidoAProductoCarrito(producto, cuotas)),
    );
    this.banderaSeleccionadaPlan = this.bandera()
      ? venta.productosPedidoDTO.some((producto) => producto.descripcion.includes(`Agregado: ${this.bandera()!.agregado}`))
      : false;
    this.cuotasPlanSeleccionadas.set(cuotas);
    this.productoEnEdicionPlan = this.crearProductoEnEdicionPlan();
    this.productoCalculadoPlan.set(null);
    this.indiceEdicionProductoPlan.set(null);
    this.edicionPlan.set(venta);
  }

  cerrarEdicionPlan(): void {
    this.edicionPlan.set(null);
    this.carritoEdicionPlan.set([]);
    this.productoEnEdicionPlan = this.crearProductoEnEdicionPlan();
    this.productoCalculadoPlan.set(null);
    this.indiceEdicionProductoPlan.set(null);
    this.banderaSeleccionadaPlan = false;
  }

  cambiarCuotasPlan(nuevasCuotas: number): void {
    this.cuotasPlanSeleccionadas.set(nuevasCuotas);

    const productos = this.carritoEdicionPlan();
    if (!productos.length) return;

    const recalculos = productos.map((producto) =>
      this.productosService
        .obtenerPrecioBeneficioProducto(producto.idProducto, nuevasCuotas, producto.cantidad)
        .pipe(
          map((precio) => {
            const costoExtras = this.agregadosIndividuales()
              .filter((extra) => producto.agregados.includes(extra.id))
              .reduce((total, extra) => total + extra.precio, 0);
            return {
              ...producto,
              cuotas: nuevasCuotas,
              valorSenia: precio.valor_senia,
              valorCuota: precio.valor_cuota + costoExtras / nuevasCuotas,
            };
          }),
        ),
    );

    forkJoin(recalculos).subscribe({
      next: (actualizados) => this.carritoEdicionPlan.set(actualizados),
      error: () =>
        this.notificaciones.error({
          title: 'No se pudo recalcular',
          description: 'No se pudieron recalcular los precios para el nuevo plan de cuotas.',
        }),
    });
  }

  cambiarAgregadoPlan(idAgregado: number, seleccionado: boolean): void {
    this.productoEnEdicionPlan.agregados = seleccionado
      ? [...this.productoEnEdicionPlan.agregados, idAgregado]
      : this.productoEnEdicionPlan.agregados.filter((id) => id !== idAgregado);
    this.calcularProductoPlan();
  }

  cambiarBanderaPlan(seleccionado: boolean): void {
    this.banderaSeleccionadaPlan = seleccionado;
  }

  calcularProductoPlan(): void {
    const { idProducto, cantidad, agregados } = this.productoEnEdicionPlan;
    const cuotas = this.cuotasPlanSeleccionadas();
    if (!idProducto || !cantidad || !cuotas) {
      this.productoCalculadoPlan.set(null);
      return;
    }

    this.productosService.obtenerPrecioBeneficioProducto(idProducto, cuotas, cantidad).subscribe({
      next: (precio) => {
        const producto = this.productosParaElegir().find((item) => item.id_producto === idProducto);
        const extras = this.agregadosIndividuales().filter((item) => agregados.includes(item.id));
        const costoExtras = extras.reduce((total, item) => total + item.precio, 0);
        const nombresExtras = extras.map((item) => item.agregado);
        this.productoCalculadoPlan.set({
          idProducto,
          nombre: producto?.nombre ?? 'Producto',
          descripcion: [producto?.descripcion, ...nombresExtras].filter(Boolean).join(' · Agregado: '),
          cantidad,
          cuotas,
          valorSenia: precio.valor_senia,
          valorCuota: precio.valor_cuota + costoExtras / cuotas,
          agregados,
        });
      },
      error: () => {
        this.productoCalculadoPlan.set(null);
        this.error.set('No se pudo calcular el precio del producto seleccionado.');
      },
    });
  }

  agregarProductoAlCarritoPlan(): void {
    const producto = this.productoCalculadoPlan();
    if (!producto) return;

    const indice = this.indiceEdicionProductoPlan();
    this.carritoEdicionPlan.update((carrito) =>
      indice === null
        ? [...carrito, producto]
        : carrito.map((item, i) => (i === indice ? producto : item)),
    );
    this.productoEnEdicionPlan = this.crearProductoEnEdicionPlan();
    this.productoCalculadoPlan.set(null);
    this.indiceEdicionProductoPlan.set(null);
  }

  editarProductoPlan(indice: number): void {
    const producto = this.carritoEdicionPlan()[indice];
    if (!producto) return;

    this.productoEnEdicionPlan = {
      idProducto: producto.idProducto,
      cantidad: producto.cantidad,
      agregados: [...producto.agregados],
    };
    this.indiceEdicionProductoPlan.set(indice);
    this.calcularProductoPlan();
  }

  cancelarEdicionProductoPlan(): void {
    this.productoEnEdicionPlan = this.crearProductoEnEdicionPlan();
    this.productoCalculadoPlan.set(null);
    this.indiceEdicionProductoPlan.set(null);
  }

  quitarProductoPlan(indice: number): void {
    if (this.indiceEdicionProductoPlan() !== null) this.cancelarEdicionProductoPlan();
    this.carritoEdicionPlan.update((carrito) => carrito.filter((_, index) => index !== indice));
  }

  nombresAgregados(ids: number[]): string {
    return this.agregadosDisponibles()
      .filter((agregado) => ids.includes(agregado.id))
      .map((agregado) => agregado.agregado)
      .join(', ');
  }

  totalSeniaPlan(): number {
    return this.carritoEdicionPlan().reduce((total, producto) => total + producto.valorSenia * producto.cantidad, 0);
  }

  totalCuotasPlanSinDescuento(): number {
    const productos = this.carritoEdicionPlan().reduce(
      (total, producto) => total + producto.valorCuota * producto.cantidad,
      0,
    );
    return productos + (this.banderaSeleccionadaPlan ? this.bandera()?.precio ?? 0 : 0);
  }

  descuentoCuotasPlan(): number {
    const venta = this.edicionPlan();
    if (!venta) return 0;
    const porcentaje = Number(venta.pedidoDTO.porcentaje_descuento_hermanos) || 0;
    const hermanos = Number(venta.pedidoDTO.cantidad_hermanos) || 0;
    return this.totalCuotasPlanSinDescuento() * (porcentaje / 100) * hermanos;
  }

  totalCuotasPlan(): number {
    return this.totalCuotasPlanSinDescuento() - this.descuentoCuotasPlan();
  }

  guardarEdicionPlan(): void {
    const venta = this.edicionPlan();
    const idPedido = venta?.productosPedidoDTO[0]?.id_pedido;
    const productos = this.carritoEdicionPlan();
    if (!venta || !idPedido || !productos.length) return;

    const beneficioActual = venta.productosPedidoDTO[0]?.beneficio ?? 'Sin Beneficio';

    const dto: ModificarPlanPedidoDTO = {
      id_pedido: idPedido,
      productos: productos.map((producto) => ({
        id_pedido: idPedido,
        id_producto_original: producto.idProducto,
        descripcion: producto.descripcion,
        beneficio: beneficioActual,
        valor_senia: producto.valorSenia,
        valor_cuota: producto.valorCuota,
        cantidad: producto.cantidad,
      })),
      nueva_cantidad_cuotas: this.cuotasPlanSeleccionadas(),
      valor_cuota_nuevo: this.totalCuotasPlan(),
      valor_senia_nuevo: this.totalSeniaPlan(),
    };

    this.guardandoPlan.set(true);
    this.gestionPedidosService.modificarProductosCuotas(dto).subscribe({
      next: () => {
        this.guardandoPlan.set(false);
        this.notificaciones.success({
          title: 'Plan actualizado',
          description: 'Los productos y el plan de cuotas se modificaron correctamente.',
        });
        this.cerrarEdicionPlan();
        this.recargarPaginaActual();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoPlan.set(false);
        this.notificarErrorGuardado(err);
      },
    });
  }

  private productoPedidoAProductoCarrito(producto: ProductoPedidoDTO, cuotas: number): ProductoCarrito {
    const [, ...nombresExtras] = producto.descripcion.split(' · Agregado: ');
    const agregados = this.agregadosIndividuales()
      .filter((extra) => nombresExtras.includes(extra.agregado))
      .map((extra) => extra.id);

    return {
      idProducto: producto.id_producto_original,
      nombre: this.nombreProducto(producto.id_producto_original),
      descripcion: producto.descripcion,
      cantidad: producto.cantidad,
      cuotas,
      valorSenia: producto.valor_senia,
      valorCuota: producto.valor_cuota,
      agregados,
    };
  }

}