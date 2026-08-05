import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
import { StorageService } from '../../services/storage/storage-service';
import { ModificarBeneficioDto } from '../../services/gestionPedidos/dto/modficaciones/modficiarBeneficio.dto';
import { ProductosPedidoService } from '../../services/productosPedidos/productos-pedido-service';
import { ProductoPedidoDTO } from '../../services/gestionPedidos/dto/ProductoPedido.dto';
import { CuotasService } from '../../services/cuotas/cuotas-service';
import { CuotaResponseDTO } from '../../services/cuotas/dto/CuotaResponseDTO';
import { CrearCuotasDTO } from '../../services/cuotas/dto/crearCuotas.dto';
import { PagosService } from '../../services/pagos/pagos-service';
import { PagoResponseDTO } from '../../services/pagos/dto/pagoResponse.dto';

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

  @ViewChild('archivoSeniaInput') private archivoSeniaInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('recursosAdicionalesInput') private recursosAdicionalesInputRef?: ElementRef<HTMLInputElement>;

  archivosSenia: File[] = [];
  archivosRecursosAdicionales: File[] = [];

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

  readonly ventas = signal<PedidoResponseVentas[]>([]);
  readonly productosDisponibles = signal<ProductoConPrecioResponseDTO[]>([]);
  readonly agregadosDisponibles = signal<AgregadoDBDTO[]>([]);
  readonly beneficiosDisponibles = signal<string[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly vistaFormulario = signal(false);
  readonly paso = signal(1);
  readonly carrito = signal<ProductoCarrito[]>([]);
  readonly beneficiosSeleccionados = signal<BeneficioSeleccionado[]>([]);
  readonly productoCalculado = signal<ProductoCarrito | null>(null);
  readonly ventasExpandidas = signal<number[]>([]);
  readonly pedidosExpandidos = signal<number[]>([]);
  cuotasDisponibles = signal<number[]>([]);

  readonly anioActual = new Date().getFullYear();
  readonly promoSeleccionada = signal(this.anioActual);
  banderaSeleccionada = false;

  colegio = this.crearColegio();
  grupo = this.crearGrupo();
  alumnosResponsables = [this.crearAlumno(), this.crearAlumno()];
  padresResponsables = [this.crearPadre(true), this.crearPadre(false), this.crearPadre(false)];
  productoEnEdicion = this.crearProductoEnEdicion();
  beneficioEnEdicion = this.crearBeneficioEnEdicion();
  detallePedido = this.crearDetallePedido();
  pago = { fechaSenia: '', fechaPrimeraCuota: '' };
  cuotasPedido: CuotaResponseDTO[] = [];

  //Para editar
  editando = signal<boolean>(false);

  readonly ventasPorPromo = computed(() =>
    [{
      promo: this.promoSeleccionada(),
      ventas: this.ventas().filter((venta) => venta.grupoDTO.promo === this.promoSeleccionada()),
    }],
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
    this.obtenerNroCuotasDispoinibles();
    this.obtenerBeneficios();
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
    this.archivosSenia = [...this.archivosSenia, ...nuevosArchivos];

    input.value = '';
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
    const pedido = this.crearPedido(usuario);

    this.subirArchivos(pedido.pagoDTO.id_pedido).subscribe({
      next: ({ urlsSenia, urlsRecursos }) => {
        pedido.documentoDTO = this.construirDocumentos(urlsSenia, urlsRecursos);

        this.gestionPedidosService.agregarPedido(pedido).subscribe({
          next: () => {
            this.guardando.set(false);
            this.notificaciones.success({
              title: 'Venta guardada',
              description: 'La venta se registró correctamente.',
            });
            this.cerrarFormulario();
            this.obtenerVentas();
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

    console.log(`SEÑA: ${this.archivosSenia.length}`);
    console.log(`Recursos: ${this.archivosRecursosAdicionales.length}`);

    const subidasSenia= this.archivosSenia.map((archivo, index) =>
      this.storageService.subirImagen({
        archivo,
        nombreArchivo:  `senia-${index + 1}-${Date.now()}-${archivo.name}`,
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
        nombreArchivo:  `recurso-${index + 1}-${Date.now()}-${archivo.name}`,
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

  private construirDocumentos(urlsSenia: string[], urlsRecursos: string[]): DocumentoDTO[] {
    const documentos: DocumentoDTO[] = [];
    urlsSenia.forEach((url) => documentos.push({ tipo: 'senia', archivo_url: url }));
    urlsRecursos.forEach((url) => documentos.push({ tipo: 'recurso adicional', archivo_url: url }));
    return documentos;
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

  private obtenerVentas(): void {
    this.cargando.set(true);
    this.gestionPedidosService.obtenerPedidos().subscribe({
      next: (ventas) => {
        this.ventas.set(ventas);
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

  private capitalizarInicial(valor: string): string {
    const limpio = valor.trim();
    return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : limpio;
  }

  private crearPedido(usuario: Usuario): CrearPedidoDTO {
    const idPedido = Date.now();
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
        id_diseñadora: 0,
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
      pagoDTO: { id_pedido: idPedido, nro_transferencia: '', tipo_pago: 'Seña', monto: this.totalSenia(), motivo: 'Seña', fecha: new Date(`${this.pago.fechaSenia}T00:00:00`) },
      movimientoDTO: { id_grupo: 0, importe: this.totalSenia(), fecha: this.pago.fechaSenia },
      documentoDTO: [],
      primerCuota: { id_pedido: idPedido, numero: 1, fecha_vencimiento: new Date(`${this.pago.fechaPrimeraCuota}T00:00:00`), importe: this.totalCuotas() },
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
    this.padresResponsables = [this.crearPadre(true), this.crearPadre(false), this.crearPadre(false)];
    this.productoEnEdicion = this.crearProductoEnEdicion();
    this.detallePedido = this.crearDetallePedido();
    this.pago = { fechaSenia: '', fechaPrimeraCuota: '' };
    this.carrito.set([]);
    this.beneficiosSeleccionados.set([]);
    this.productoCalculado.set(null);
    this.banderaSeleccionada = false;
    this.archivosSenia = [];
    this.archivosRecursosAdicionales = [];
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

  private crearBeneficioEnEdicion() {
    return { nombre: '', cantidad: 1 };
  }

  private crearDetallePedido() {
    return { talles: '', colores: '',molderias: '', cantidad_hermanos: 0, porcentaje_descuento_hermanos: 0, envio_gratis: false, observaciones: '' };
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

  //EDICIONES
  //BENEFICIO

  editarBeneficio(nuevoBeneficio: string, idPedido:number)
  {
    const dto: ModificarBeneficioDto = {beneficio: nuevoBeneficio};

    this.gestionPedidosService.modificarBeneficio(dto, idPedido);
  }

  modificarProductosCuotas(idPedido: number, nuevosProductos?: ProductoPedidoDTO[], nuevaCantidadCuotas?: number, totalAntiguo: number, totalNuevo:number,valorCuota:number, valorSenia:number)
  {
    const diferenciaPrecios = totalAntiguo - totalNuevo;
    //Si cambio algo de productos eliminamos los viejos productos e insertamos los nuevos:
    if(nuevosProductos)
    {
      this.modificarProductosPedido(idPedido, nuevosProductos)
    }

    //Si cambio el plan de cuotas (aca agregar un if de comprobacion):
    if(nuevaCantidadCuotas)
    {
      this.crearNuevasCuotas(idPedido, nuevaCantidadCuotas, totalNuevo, valorCuota, valorSenia);
    }
    //Si no cambio solo modificamos el importe de las cuotas restantes:
    this.modificarImporteCuotasSiguientes(idPedido, totalAntiguo, totalNuevo);
  }

  modificarImporteCuotasSiguientes(idPedido: number, totalAntiguo: number, totalNuevo: number)
  {
      const diferenciaAPagar = totalNuevo - totalAntiguo;
    let cuotasPagadas: CuotaResponseDTO[] = [];
    this.cuotasService.traerCuotasPendientesIdPedido(idPedido).subscribe({
    next: (data) => {cuotasPagadas = data}})
    const diferenciaAPagarCuotas = diferenciaAPagar / (this.cuotasPedido.length - cuotasPagadas.length);
    this.cuotasService.modificarImporteCuotasPendientesPedido({id_pedido: idPedido, importe: diferenciaAPagarCuotas});
  }

  crearNuevasCuotas(idPedido: number, nuevaCantidadCuotas: number, totalNuevo: number, valorCuota:number, valorSenia:number)
  {
    //Traemos las cuotas para conseguir las fechas de vencimiento
    this.cuotasService.traerCuotasIdPedido(idPedido).subscribe({
    next: (data) => {this.cuotasPedido = data}})
    
    //Eliminamos las viejas
    this.cuotasService.eliminarCuotasPedido(idPedido);

    //Creamos las nuevas El importe de cada cuota ya lo tiene directamente el combo comprado.
    let crearCuotasDTO: CrearCuotasDTO = {nroCuotas: nuevaCantidadCuotas, primerCuota: {id_pedido: idPedido, numero: 1, fecha_vencimiento: this.cuotasPedido[0].fecha_vencimiento, importe:}}
    this.cuotasService.agregarCuotas(crearCuotasDTO).subscribe();

    this.pagarCuotas(idPedido, nuevaCantidadCuotas, valorCuota, valorSenia);
  }

  pagarCuotas(idPedido:number, nuevaCantidadCuotas:number, valorCuota:number, valorSenia:number)
  {
    const pagoTotal = this.calcularMontoPagos(idPedido);
    let pagoDisponible = pagoTotal - valorSenia;

    for (let index = 0; index < nuevaCantidadCuotas; index++) 
    {
      const restante = pagoDisponible - valorCuota
      if(restante > 0)
      {
        this.cuotasService.pagarCuotasPedido({id_pedido: idPedido, numero: index +1})
      }
      else
      {
        const valorConMontoAFavor = valorCuota - restante;
        this.cuotasService.modificarImporteUnaCuotasPedido({id_pedido: idPedido, numero: index +1, importe: valorConMontoAFavor});
      }
    }
  }

  calcularMontoPagos(idPedido:number): number
  {
    let pagos: PagoResponseDTO[] = [];
    //Traemos todos los pagos y sumamos los importes. 
    this.pagosService.traerPagosIdPedido(idPedido).subscribe({
    next: (data) => {pagos = data}})

    let pagoTotal = 0;

    for (const pago of pagos) 
    {
      pagoTotal += pago.monto;
    }

    return pagoTotal
  }

  modificarProductosPedido(idPedido: number, nuevosProductos: ProductoPedidoDTO[])
  {
    //Primero eliminamos todos
    this.productosPedidosService.eliminarTodosProductoPedido(idPedido).subscribe();
    //Creamos los nuevos con esta funcion, puse los productos como parametro pero puede armarse donde quieras:
    this.productosPedidosService.crearProductosPedido(nuevosProductos).subscribe();
  }

}
