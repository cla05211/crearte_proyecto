import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { GestionPedidosService } from '../../../../services/gestionPedidos/gestion-pedidos-service';
import { presupuestoPedidoClientesPage } from '../../../../services/gestionPedidos/dto/PresupuestoPedidoClientePage.dto';
import { AgregadoGlobalPedidoResponseDTO } from '../../../../services/gestionPedidos/dto/AgregadoGlobalPedidoResponse.dto';
import { ProductoPedidoResponseConNombreOriginalDTO } from '../../../../services/productosPedidos/dto/ProductoPedidoResponse.dto';
import { ProductosService } from '../../../../services/productos/productos-service';
import { ProductoPreciosDTO } from '../../../../services/productos/dto/ProductoPrecios.dto';
import { ProductoConPrecioResponseDTO } from '../../../../services/productos/dto/ProductoConPrecioResponse';
import { AgregadoDBDTO } from '../../../../services/productos/dto/agregadoDB.dto';
import { GruposService } from '../../../../services/grupos/grupos-service';
import { ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../shared/notifications/notification.service';
import { PermisosService } from '../../../../services/permisos/permisos';
import { ModificarBeneficioDto } from '../../../../services/gestionPedidos/dto/modficaciones/modficiarBeneficio.dto';
import { ModificarPlanPedidoDTO } from '../../../../services/gestionPedidos/dto/modficaciones/ModificarPlanPedido';

const SEPARADOR_AGREGADOS = ' · Agregado: ';

interface AgregadoConPrecio
{
  id: number;
  nombre: string;
  cuotaIndividual: number;
  cuotaGrupal: number;
}

interface ProductoPedidoConPrecios
{
  id: number;
  nombreProductoOriginal: string;
  descripcion: string | null;
  cantidad: number;
  valorSeniaIndividual: number;
  valorSeniaGrupal: number;
  valorCuotaIndividual: number;
  valorCuotaGrupal: number;
  agregados: AgregadoConPrecio[];
}

interface ProductoCarrito
{
  idProducto: number;
  nombre: string;
  descripcion: string;
  cantidad: number;
  cuotas: number;
  valorSenia: number;
  valorCuota: number;
  agregados: number[];
}

interface BeneficioSeleccionado
{
  nombre: string;
  cantidad: number;
}

@Component({
  selector: 'app-presupuesto',
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './presupuesto.html',
  styleUrl: './presupuesto.css',
})
export class Presupuesto implements OnInit
{
  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly productosService = inject(ProductosService);
  private readonly gruposService = inject(GruposService);
  private readonly notificaciones = inject(NotificationService);
  private readonly permisosService = inject(PermisosService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly presupuestoGrupo = signal<presupuestoPedidoClientesPage | null>(null);
  readonly productosConPrecios = signal<ProductoPedidoConPrecios[]>([]);
  readonly agregadosGlobalesConPrecios = signal<AgregadoConPrecio[]>([]);
  readonly cargando = signal(false);
  readonly cargandoPrecios = signal(false);
  readonly productosConAgregadosAbiertos = signal<ReadonlySet<number>>(new Set());

  readonly beneficioPedido = computed(() => this.presupuestoGrupo()?.productosPedido[0]?.beneficio || 'Sin beneficio');

  //Datos para edición
  readonly productosDisponibles = signal<ProductoConPrecioResponseDTO[]>([]);
  readonly agregadosDisponibles = signal<AgregadoDBDTO[]>([]);
  readonly beneficiosDisponibles = signal<string[]>([]);
  readonly cuotasDisponibles = signal<number[]>([]);

  readonly agregadosIndividuales = computed(() =>
    this.agregadosDisponibles().filter((agregado) => agregado.individual),
  );

  readonly bandera = computed(() =>
    this.agregadosDisponibles().find((agregado) => !agregado.individual) ?? null,
  );

  readonly productosParaElegir = computed(() => {
    const vistos = new Set<number>();
    return this.productosDisponibles().filter((producto) => {
      if (vistos.has(producto.id_producto)) return false;
      vistos.add(producto.id_producto);
      return true;
    });
  });

  //Edición de beneficio
  readonly edicionBeneficioAbierta = signal(false);
  readonly beneficiosSeleccionadosEdicion = signal<BeneficioSeleccionado[]>([]);
  readonly guardandoBeneficio = signal(false);
  beneficioEnEdicionForm = this.crearBeneficioEnEdicion();

  //Edición de plan (productos y cuotas)
  readonly edicionPlanAbierta = signal(false);
  readonly carritoEdicionPlan = signal<ProductoCarrito[]>([]);
  readonly cuotasPlanSeleccionadas = signal<number>(0);
  readonly productoCalculadoPlan = signal<ProductoCarrito | null>(null);
  readonly guardandoPlan = signal(false);
  readonly indiceEdicionProductoPlan = signal<number | null>(null);
  productoEnEdicionPlan = this.crearProductoEnEdicionPlan();
  banderaSeleccionadaPlan = false;

  readonly totalSenia = computed(() =>
    this.productosConPrecios().reduce((total, producto) => total + producto.valorSeniaGrupal, 0),
  );

  readonly totalCuota = computed(() => {
    const productos = this.productosConPrecios().reduce(
      (total, producto) =>
        total + producto.valorCuotaGrupal + producto.agregados.reduce((totalAgregados, agregado) => totalAgregados + agregado.cuotaGrupal, 0),
      0,
    );
    const agregadosGlobales = this.agregadosGlobalesConPrecios().reduce((total, agregado) => total + agregado.cuotaGrupal, 0);
    return productos + agregadosGlobales;
  });

  readonly totalSeniaIndividual = computed(() =>
    this.productosConPrecios().reduce((total, producto) => total + producto.valorSeniaIndividual, 0),
  );

  readonly totalCuotaIndividual = computed(() => {
    const productos = this.productosConPrecios().reduce(
      (total, producto) =>
        total + producto.valorCuotaIndividual + producto.agregados.reduce((totalAgregados, agregado) => totalAgregados + agregado.cuotaIndividual, 0),
      0,
    );
    const agregadosGlobales = this.agregadosGlobalesConPrecios().reduce((total, agregado) => total + agregado.cuotaIndividual, 0);
    return productos + agregadosGlobales;
  });

  ngOnInit(): void
  {
    this.traerPresupuestoGrupo();

    if (this.puedeEditarPedido())
    {
      this.obtenerProductosDisponibles();
      this.obtenerBeneficiosDisponibles();
      this.obtenerCuotasDisponibles();
    }
  }

  puedeEditarPedido(): boolean
  {
    return this.permisosService.tienePermiso('modificar_pedidos');
  }

  toggleAgregados(idProducto: number): void
  {
    this.productosConAgregadosAbiertos.update((abiertos) => {
      const nuevo = new Set(abiertos);
      if (nuevo.has(idProducto))
      {
        nuevo.delete(idProducto);
      }
      else
      {
        nuevo.add(idProducto);
      }
      return nuevo;
    });
  }

  traerPresupuestoGrupo(): void
  {
    const idGrupo = Number(this.route.parent?.snapshot.paramMap.get('id'));

    this.cargando.set(true);

    this.gestionPedidosService.obtenerPresupuestoPedidoClientesPage(idGrupo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (presupuesto) => {
          this.presupuestoGrupo.set(presupuesto);
          this.cargando.set(false);
          this.traerPreciosProductos(presupuesto, idGrupo);
        },
        error: () => {
          this.cargando.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los datos del colegio.' });
        },
      });
  }

  private traerPreciosProductos(presupuesto: presupuestoPedidoClientesPage, idGrupo: number): void
  {
    this.cargandoPrecios.set(true);

    const precios$ = presupuesto.productosPedido.length
      ? forkJoin(
          presupuesto.productosPedido.map((producto) =>
            this.productosService.obtenerPreciosProducto(producto.id_producto_original, presupuesto.nroCuotas, producto.cantidad),
          ),
        )
      : of([] as ProductoPreciosDTO[]);

    const agregadosDisponibles$ = this.productosService.obtenerAgregados();

    const cantidadEgresados$ = presupuesto.agregadosGlobales.length
      ? this.gruposService.obtenerCantidadEgresados(idGrupo)
      : of(0);

    forkJoin([precios$, agregadosDisponibles$, cantidadEgresados$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([precios, agregadosDisponibles, cantidadEgresados]) => {
          const agregadosIndividuales = agregadosDisponibles.filter((agregado) => agregado.individual);

          this.agregadosDisponibles.set(agregadosDisponibles);

          this.productosConPrecios.set(
            presupuesto.productosPedido.map((producto, indice) =>
              this.combinarProductoConPrecios(producto, precios[indice], presupuesto.nroCuotas, agregadosIndividuales),
            ),
          );

          this.agregadosGlobalesConPrecios.set(
            presupuesto.agregadosGlobales.map((agregado) =>
              this.combinarAgregadoGlobalConPrecios(agregado, presupuesto.nroCuotas, cantidadEgresados),
            ),
          );

          this.cargandoPrecios.set(false);
        },
        error: () => {
          this.cargandoPrecios.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los precios de los productos.' });
        },
      });
  }

  private combinarProductoConPrecios(
    producto: ProductoPedidoResponseConNombreOriginalDTO,
    precios: ProductoPreciosDTO,
    nroCuotas: number,
    agregadosIndividuales: AgregadoDBDTO[],
  ): ProductoPedidoConPrecios
  {
    const [descripcionBase, ...nombresAgregados] = (producto.descripcion ?? '').split(SEPARADOR_AGREGADOS);

    const agregados: AgregadoConPrecio[] = agregadosIndividuales
      .filter((agregado) => nombresAgregados.includes(agregado.agregado))
      .map((agregado) => ({
        id: agregado.id,
        nombre: agregado.agregado,
        cuotaIndividual: agregado.precio / nroCuotas,
        cuotaGrupal: (agregado.precio * producto.cantidad) / nroCuotas,
      }));

    return {
      id: producto.id,
      nombreProductoOriginal: producto.nombreProductoOriginal,
      descripcion: descripcionBase || null,
      cantidad: producto.cantidad,
      valorSeniaIndividual: precios.valor_senia,
      valorSeniaGrupal: precios.valor_senia * producto.cantidad,
      valorCuotaIndividual: precios.valor_cuota,
      valorCuotaGrupal: precios.valor_cuota * producto.cantidad,
      agregados,
    };
  }

  private combinarAgregadoGlobalConPrecios(
    agregado: AgregadoGlobalPedidoResponseDTO,
    nroCuotas: number,
    cantidadEgresados: number,
  ): AgregadoConPrecio
  {
    const precioGrupal = agregado.precio;
    const precioIndividual = cantidadEgresados > 0 ? precioGrupal / cantidadEgresados : 0;

    return {
      id: agregado.id,
      nombre: agregado.agregado,
      cuotaIndividual: precioIndividual / nroCuotas,
      cuotaGrupal: precioGrupal / nroCuotas,
    };
  }

  private obtenerProductosDisponibles(): void
  {
    this.productosService.obtenerProductos().subscribe({
      next: (productos) => this.productosDisponibles.set(productos),
    });
  }

  private obtenerBeneficiosDisponibles(): void
  {
    this.gestionPedidosService.obtenerBeneficios().subscribe({
      next: (beneficios) => this.beneficiosDisponibles.set([...beneficios, 'Sin beneficio']),
    });
  }

  private obtenerCuotasDisponibles(): void
  {
    this.productosService.obtenerCuotasDisponibles().subscribe({
      next: (cuotas) => this.cuotasDisponibles.set(cuotas),
    });
  }

  private notificarErrorGuardado(err: HttpErrorResponse): void
  {
    const mensajeBackend: string = err?.error?.message ?? '';

    if (err.status === 0)
    {
      this.notificaciones.error({ title: 'Sin conexión', description: 'No se pudo conectar con el servidor. Verificá tu conexión a internet.' });
      return;
    }

    if (err.status === 401 || err.status === 403)
    {
      this.notificaciones.error({ title: 'Sesión no válida', description: 'No tenés permisos o tu sesión expiró. Volvé a iniciar sesión.' });
      return;
    }

    if (/duplicate key|unique constraint/i.test(mensajeBackend))
    {
      this.notificaciones.error({ title: 'Registro duplicado', description: 'Ya existe un registro con esos datos.' });
      return;
    }

    if (/null value.*not-null constraint/i.test(mensajeBackend))
    {
      this.notificaciones.error({ title: 'Faltan datos', description: 'Falta completar un campo obligatorio. Revisá el formulario e intentá nuevamente.' });
      return;
    }

    if (/invalid input syntax for type (date|timestamp)/i.test(mensajeBackend))
    {
      this.notificaciones.error({ title: 'Fecha inválida', description: 'Una de las fechas ingresadas no es válida.' });
      return;
    }

    if (/invalid input syntax/i.test(mensajeBackend))
    {
      this.notificaciones.error({ title: 'Datos inválidos', description: 'Uno de los valores ingresados no tiene un formato válido.' });
      return;
    }

    if (/violates foreign key constraint/i.test(mensajeBackend))
    {
      this.notificaciones.error({ title: 'Referencia inválida', description: 'Uno de los datos seleccionados (producto, colegio, etc.) ya no existe.' });
      return;
    }

    if (err.status >= 500)
    {
      this.notificaciones.error({ title: 'Error del servidor', description: 'Ocurrió un error interno. Intentá nuevamente en unos minutos.' });
      return;
    }

    this.notificaciones.error({
      title: 'No se pudo guardar el pedido',
      description: mensajeBackend || 'Ocurrió un error inesperado. Intentá nuevamente.',
    });
  }

  //MODIFICACIONES

  //--- Beneficio ---

  private crearBeneficioEnEdicion()
  {
    return { nombre: '', cantidad: 1 };
  }

  abrirEdicionBeneficio(): void
  {
    const presupuesto = this.presupuestoGrupo();
    if (!presupuesto) return;

    this.beneficiosSeleccionadosEdicion.set(this.parsearBeneficios(presupuesto.productosPedido[0]?.beneficio ?? ''));
    this.beneficioEnEdicionForm = this.crearBeneficioEnEdicion();
    this.edicionBeneficioAbierta.set(true);
  }

  cerrarEdicionBeneficio(): void
  {
    this.edicionBeneficioAbierta.set(false);
    this.beneficiosSeleccionadosEdicion.set([]);
    this.beneficioEnEdicionForm = this.crearBeneficioEnEdicion();
  }

  agregarBeneficioEdicion(): void
  {
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

  quitarBeneficioEdicion(indice: number): void
  {
    this.beneficiosSeleccionadosEdicion.update((beneficios) =>
      beneficios.filter((_, i) => i !== indice),
    );
  }

  textoBeneficiosEdicion(): string
  {
    if (!this.beneficiosSeleccionadosEdicion().length) return 'Sin Beneficio';
    return this.beneficiosSeleccionadosEdicion()
      .map((beneficio) => `${beneficio.cantidad} ${beneficio.nombre}`)
      .join(' - ');
  }

  guardarEdicionBeneficio(): void
  {
    const presupuesto = this.presupuestoGrupo();
    const idPedido = presupuesto?.pedido.id;
    if (!presupuesto || !idPedido) return;

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
        this.traerPresupuestoGrupo();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoBeneficio.set(false);
        this.notificarErrorGuardado(err);
      },
    });
  }

  private parsearBeneficios(texto: string): BeneficioSeleccionado[]
  {
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

  private crearProductoEnEdicionPlan()
  {
    return { idProducto: 0, cantidad: 0, agregados: [] as number[] };
  }

  private productoPedidoAProductoCarrito(producto: ProductoPedidoResponseConNombreOriginalDTO, cuotas: number): ProductoCarrito
  {
    const [, ...nombresExtras] = producto.descripcion.split(SEPARADOR_AGREGADOS);
    const agregados = this.agregadosIndividuales()
      .filter((extra) => nombresExtras.includes(extra.agregado))
      .map((extra) => extra.id);

    return {
      idProducto: producto.id_producto_original,
      nombre: producto.nombreProductoOriginal,
      descripcion: producto.descripcion,
      cantidad: producto.cantidad,
      cuotas,
      valorSenia: producto.valor_senia,
      valorCuota: producto.valor_cuota,
      agregados,
    };
  }

  abrirEdicionPlan(): void
  {
    const presupuesto = this.presupuestoGrupo();
    if (!presupuesto) return;

    const cuotas = presupuesto.nroCuotas;
    this.carritoEdicionPlan.set(
      presupuesto.productosPedido.map((producto) => this.productoPedidoAProductoCarrito(producto, cuotas)),
    );
    this.banderaSeleccionadaPlan = this.bandera()
      ? presupuesto.agregadosGlobales.some((agregado) => agregado.id_agregado === this.bandera()!.id)
      : false;
    this.cuotasPlanSeleccionadas.set(cuotas);
    this.productoEnEdicionPlan = this.crearProductoEnEdicionPlan();
    this.productoCalculadoPlan.set(null);
    this.indiceEdicionProductoPlan.set(null);
    this.edicionPlanAbierta.set(true);
  }

  cerrarEdicionPlan(): void
  {
    this.edicionPlanAbierta.set(false);
    this.carritoEdicionPlan.set([]);
    this.productoEnEdicionPlan = this.crearProductoEnEdicionPlan();
    this.productoCalculadoPlan.set(null);
    this.indiceEdicionProductoPlan.set(null);
    this.banderaSeleccionadaPlan = false;
  }

  cambiarCuotasPlan(nuevasCuotas: number): void
  {
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

  cambiarAgregadoPlan(idAgregado: number, seleccionado: boolean): void
  {
    this.productoEnEdicionPlan.agregados = seleccionado
      ? [...this.productoEnEdicionPlan.agregados, idAgregado]
      : this.productoEnEdicionPlan.agregados.filter((id) => id !== idAgregado);
    this.calcularProductoPlan();
  }

  cambiarBanderaPlan(seleccionado: boolean): void
  {
    this.banderaSeleccionadaPlan = seleccionado;
  }

  calcularProductoPlan(): void
  {
    const { idProducto, cantidad, agregados } = this.productoEnEdicionPlan;
    const cuotas = this.cuotasPlanSeleccionadas();
    if (!idProducto || !cantidad || !cuotas)
    {
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
        this.notificaciones.error({
          title: 'No se pudo calcular el precio',
          description: 'No se pudo calcular el precio del producto seleccionado.',
        });
      },
    });
  }

  agregarProductoAlCarritoPlan(): void
  {
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

  editarProductoPlan(indice: number): void
  {
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

  cancelarEdicionProductoPlan(): void
  {
    this.productoEnEdicionPlan = this.crearProductoEnEdicionPlan();
    this.productoCalculadoPlan.set(null);
    this.indiceEdicionProductoPlan.set(null);
  }

  quitarProductoPlan(indice: number): void
  {
    if (this.indiceEdicionProductoPlan() !== null) this.cancelarEdicionProductoPlan();
    this.carritoEdicionPlan.update((carrito) => carrito.filter((_, index) => index !== indice));
  }

  nombresAgregados(ids: number[]): string
  {
    return this.agregadosDisponibles()
      .filter((agregado) => ids.includes(agregado.id))
      .map((agregado) => agregado.agregado)
      .join(', ');
  }

  totalSeniaPlan(): number
  {
    return this.carritoEdicionPlan().reduce((total, producto) => total + producto.valorSenia * producto.cantidad, 0);
  }

  totalCuotasPlanSinDescuento(): number
  {
    const productos = this.carritoEdicionPlan().reduce(
      (total, producto) => total + producto.valorCuota * producto.cantidad,
      0,
    );
    return productos + (this.banderaSeleccionadaPlan ? this.bandera()?.precio ?? 0 : 0);
  }

  descuentoCuotasPlan(): number
  {
    const presupuesto = this.presupuestoGrupo();
    if (!presupuesto) return 0;
    const porcentaje = Number(presupuesto.pedido.porcentaje_descuento_hermanos) || 0;
    const hermanos = Number(presupuesto.pedido.cantidad_hermanos) || 0;
    return this.totalCuotasPlanSinDescuento() * (porcentaje / 100) * hermanos;
  }

  totalCuotasPlan(): number
  {
    return this.totalCuotasPlanSinDescuento() - this.descuentoCuotasPlan();
  }

  guardarEdicionPlan(): void
  {
    const presupuesto = this.presupuestoGrupo();
    const idPedido = presupuesto?.pedido.id;
    const productos = this.carritoEdicionPlan();
    if (!presupuesto || !idPedido || !productos.length) return;

    const beneficioActual = presupuesto.productosPedido[0]?.beneficio ?? 'Sin Beneficio';

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
      agregadosGlobales:
        this.banderaSeleccionadaPlan && this.bandera() ? [{ id_agregado: this.bandera()!.id }] : [],
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
        this.traerPresupuestoGrupo();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoPlan.set(false);
        this.notificarErrorGuardado(err);
      },
    });
  }
}
