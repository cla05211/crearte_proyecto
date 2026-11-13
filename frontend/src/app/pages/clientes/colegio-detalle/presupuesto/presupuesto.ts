import { CuotasService } from '../../../../services/cuotas/cuotas-service';
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
import { ProductoConPrecioResponseDTO } from '../../../../services/productos/dto/ProductoConPrecioResponse';
import { AgregadoDBDTO } from '../../../../services/productos/dto/agregadoDB.dto';
import { GruposService } from '../../../../services/grupos/grupos-service';
import { ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../shared/notifications/notification.service';
import { PermisosService } from '../../../../services/permisos/permisos';
import { BeneficioResponseDTO } from '../../../../services/gestionPedidos/dto/BeneficioResponse.dto';
import { BeneficioPedidoPostDTO, cantidadSinCargo, formatearBeneficios } from '../../../../services/gestionPedidos/dto/BeneficioPedido.dto';
import { ModificarPlanPedidoDTO } from '../../../../services/gestionPedidos/dto/modficaciones/ModificarPlanPedido';
import { clavePlan, CuotaParaMostrar, cuotasParaMostrar, cuotasTodasIguales, etiquetaPlan, pagosDelPlan, parteAgregadoGlobal, PlanCuotas, planDesdeClave, planesConActual, preciosConAgregados } from '../../../../services/cuotas/plan-cuotas';
import { AgregadoProductoPedidoDTO } from '../../../../services/productosPedidos/dto/AgregadoProductoPedido.dto';

const SEPARADOR_AGREGADOS = ' · Agregado: ';

interface AgregadoConPrecio
{
  id: number;
  nombre: string;
  cuotaIndividual: number;
  cuotaGrupal: number;
  // En cuotas iguales el agregado también va en la seña (la seña es la cuota 1)
  seniaIndividual: number;
  seniaGrupal: number;
}

interface ProductoPedidoConPrecios
{
  id: number;
  sinCargo: number;
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
  conSenia: boolean;
  valorSenia: number;
  valorCuota: number;
  agregados: number[];
  // id del agregado -> precio cobrado (total por prenda)
  preciosAgregados: Record<number, number>;
}

interface BeneficioSeleccionado
{
  id_beneficio: number;
  beneficio: string;
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
  private readonly cuotasService = inject(CuotasService);
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

  readonly beneficioPedido = computed(() => formatearBeneficios(this.presupuestoGrupo()?.beneficios));

  /** Prendas sin cargo (beneficio) de un producto del pedido. */
  sinCargoProducto(idProducto: number): number
  {
    return cantidadSinCargo(this.presupuestoGrupo()?.beneficios, idProducto);
  }


  readonly productosDisponibles = signal<ProductoConPrecioResponseDTO[]>([]);
  readonly agregadosDisponibles = signal<AgregadoDBDTO[]>([]);
  readonly beneficiosDisponibles = signal<BeneficioResponseDTO[]>([]);
  // Planes activos del catálogo (cuotas + si lleva seña), para elegir un plan nuevo en la edición
  readonly planesDisponibles = signal<PlanCuotas[]>([]);

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
  readonly conSeniaPlanSeleccionada = signal(false);
  readonly clavePlanSeleccionada = computed(() =>
    clavePlan({ cuotas: this.cuotasPlanSeleccionadas(), conSenia: this.conSeniaPlanSeleccionada() }));
  // Plan que tenía el pedido al abrir la edición: se ofrece aunque esté desactivado en el catálogo
  private readonly planOriginalEdicion = signal<PlanCuotas | null>(null);
  readonly planesEdicion = computed(() => planesConActual(this.planesDisponibles(), this.planOriginalEdicion()));
  readonly productoCalculadoPlan = signal<ProductoCarrito | null>(null);
  readonly guardandoPlan = signal(false);
  readonly indiceEdicionProductoPlan = signal<number | null>(null);

  // Cuotas reales del pedido (lo que se cobra): pueden no coincidir con el precio de lista del plan,
  // por ejemplo si la seña quedó fija al cambiar de plan o se pagaron cuotas antes de un cambio
  readonly cuotasReales = signal<CuotaParaMostrar[]>([]);
  readonly cuotasRealesIguales = computed(() => cuotasTodasIguales(this.cuotasReales()));


  // Contadores para ignorar respuestas de precio viejas (llegan desordenadas si se cambian opciones rápido)
  private solicitudCalculoPlan = 0;
  private solicitudRecalculoPlan = 0;
  productoEnEdicionPlan = this.crearProductoEnEdicionPlan();
  banderaSeleccionadaPlan = false;

  readonly totalSenia = computed(() => {
    const productos = this.productosConPrecios().reduce(
      (total, producto) =>
        total + producto.valorSeniaGrupal + producto.agregados.reduce((totalAgregados, agregado) => totalAgregados + agregado.seniaGrupal, 0),
      0,
    );
    return productos + this.agregadosGlobalesConPrecios().reduce((total, agregado) => total + agregado.seniaGrupal, 0);
  });

  // Seña acordada: queda fija desde la primera modificación del plan (aunque cambien los productos)
  readonly seniaAcordada = computed(() => this.presupuestoGrupo()?.pedido.senia_total ?? this.totalSenia());

  readonly totalCuota = computed(() => {
    const productos = this.productosConPrecios().reduce(
      (total, producto) =>
        total + producto.valorCuotaGrupal + producto.agregados.reduce((totalAgregados, agregado) => totalAgregados + agregado.cuotaGrupal, 0),
      0,
    );
    const agregadosGlobales = this.agregadosGlobalesConPrecios().reduce((total, agregado) => total + agregado.cuotaGrupal, 0);
    return productos + agregadosGlobales;
  });

  readonly totalSeniaIndividual = computed(() => {
    const productos = this.productosConPrecios().reduce(
      (total, producto) =>
        total + producto.valorSeniaIndividual + producto.agregados.reduce((totalAgregados, agregado) => totalAgregados + agregado.seniaIndividual, 0),
      0,
    );
    return productos + this.agregadosGlobalesConPrecios().reduce((total, agregado) => total + agregado.seniaIndividual, 0);
  });

  readonly totalCuotaIndividual = computed(() => {
    const productos = this.productosConPrecios().reduce(
      (total, producto) =>
        total + producto.valorCuotaIndividual + producto.agregados.reduce((totalAgregados, agregado) => totalAgregados + agregado.cuotaIndividual, 0),
      0,
    );
    const agregadosGlobales = this.agregadosGlobalesConPrecios().reduce((total, agregado) => total + agregado.cuotaIndividual, 0);
    return productos + agregadosGlobales;
  });

  // Descuento por hermanos: se aplica sobre el total de cuotas (mismo criterio que Ventas y el recálculo por talles)
  readonly factorDescuentoHermanos = computed(() => {
    const pedido = this.presupuestoGrupo()?.pedido;
    const porcentaje = Number(pedido?.porcentaje_descuento_hermanos) || 0;
    const hermanos = Number(pedido?.cantidad_hermanos) || 0;
    return (porcentaje / 100) * hermanos;
  });

  readonly descuentoHermanos = computed(() => this.totalCuota() * this.factorDescuentoHermanos());
  readonly descuentoHermanosIndividual = computed(() => this.totalCuotaIndividual() * this.factorDescuentoHermanos());
  readonly totalCuotaFinal = computed(() => this.totalCuota() - this.descuentoHermanos());
  readonly totalCuotaIndividualFinal = computed(() => this.totalCuotaIndividual() - this.descuentoHermanosIndividual());

  readonly etiquetaPlanCuotas = computed(() => {
    const presupuesto = this.presupuestoGrupo();
    if (!presupuesto) return '';

    return etiquetaPlan(presupuesto.nroCuotas, presupuesto.pedido.con_senia);
  });

  ngOnInit(): void
  {
    this.traerPresupuestoGrupo();

    if (this.puedeEditarPedido())
    {
      this.obtenerProductosDisponibles();
      this.obtenerBeneficiosDisponibles();
      this.obtenerPlanesDisponibles();
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
          this.traerCuotasReales(presupuesto.pedido.id, presupuesto.pedido.con_senia);
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

    const agregadosDisponibles$ = this.productosService.obtenerAgregados();

    const cantidadEgresados$ = presupuesto.agregadosGlobales.length
      ? this.gruposService.obtenerCantidadEgresados(idGrupo)
      : of(0);

    forkJoin([agregadosDisponibles$, cantidadEgresados$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([agregadosDisponibles, cantidadEgresados]) => {
          const agregadosIndividuales = agregadosDisponibles.filter((agregado) => agregado.individual);

          this.agregadosDisponibles.set(agregadosDisponibles);

          this.productosConPrecios.set(
            presupuesto.productosPedido.map((producto) =>
              this.combinarProductoConPrecios(producto, presupuesto.nroCuotas, presupuesto.pedido.con_senia, agregadosIndividuales),
            ),
          );

          this.agregadosGlobalesConPrecios.set(
            presupuesto.agregadosGlobales.map((agregado) =>
              this.combinarAgregadoGlobalConPrecios(agregado, presupuesto.nroCuotas, presupuesto.pedido.con_senia, cantidadEgresados),
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
    nroCuotas: number,
    conSenia: boolean,
    agregadosIndividuales: AgregadoDBDTO[],
  ): ProductoPedidoConPrecios
  {
    const [descripcionBase, ...nombresAgregados] = (producto.descripcion ?? '').split(SEPARADOR_AGREGADOS);

    // Agregados con el precio que se cobró; los pedidos viejos solo los tienen en la descripción (precio del catálogo)
    const cobrados = producto.agregados?.length
      ? producto.agregados.map((agregado) => ({ id: agregado.id_agregado, nombre: agregado.agregado, precio: Number(agregado.precio) }))
      : agregadosIndividuales
          .filter((agregado) => nombresAgregados.includes(agregado.agregado))
          .map((agregado) => ({ id: agregado.id, nombre: agregado.agregado, precio: Number(agregado.precio) }));

    // Con seña se reparten en las cuotas; en cuotas iguales, entre la seña y las cuotas
    const pagos = pagosDelPlan(nroCuotas, conSenia) || 1;
    const agregados: AgregadoConPrecio[] = cobrados.map((agregado) => ({
      id: agregado.id,
      nombre: agregado.nombre,
      cuotaIndividual: agregado.precio / pagos,
      cuotaGrupal: (agregado.precio * producto.cantidad) / pagos,
      seniaIndividual: conSenia ? 0 : agregado.precio / pagos,
      seniaGrupal: conSenia ? 0 : (agregado.precio * producto.cantidad) / pagos,
    }));

    // Se usan los valores guardados del pedido (lo que realmente se cobra), no la lista de precios actual.
    // valor_cuota (y en cuotas iguales también valor_senia) ya incluyen los agregados: se descuentan para mostrarlos en su fila.
    const cuotaAgregados = agregados.reduce((total, agregado) => total + agregado.cuotaIndividual, 0);
    const seniaAgregados = agregados.reduce((total, agregado) => total + agregado.seniaIndividual, 0);
    const valorCuotaBase = Number(producto.valor_cuota) - cuotaAgregados;
    const valorSeniaBase = Number(producto.valor_senia) - seniaAgregados;

    return {
      id: producto.id,
      sinCargo: cantidadSinCargo(this.presupuestoGrupo()?.beneficios, producto.id_producto_original),
      nombreProductoOriginal: producto.nombreProductoOriginal,
      descripcion: descripcionBase || null,
      cantidad: producto.cantidad,
      valorSeniaIndividual: valorSeniaBase,
      valorSeniaGrupal: valorSeniaBase * producto.cantidad,
      valorCuotaIndividual: valorCuotaBase,
      valorCuotaGrupal: valorCuotaBase * producto.cantidad,
      agregados,
    };
  }

  private traerCuotasReales(idPedido: number, conSenia: boolean): void
  {
    this.cuotasService.traerCuotasIdPedido(idPedido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cuotas) => this.cuotasReales.set(cuotasParaMostrar(cuotas, conSenia)),
        error: () => this.cuotasReales.set([]),
      });
  }

  private combinarAgregadoGlobalConPrecios(
    agregado: AgregadoGlobalPedidoResponseDTO,
    nroCuotas: number,
    conSenia: boolean,
    cantidadEgresados: number,
  ): AgregadoConPrecio
  {
    const precioGrupal = Number(agregado.precio);
    const precioIndividual = cantidadEgresados > 0 ? precioGrupal / cantidadEgresados : 0;
    const grupal = parteAgregadoGlobal(precioGrupal, nroCuotas, conSenia);
    const individual = parteAgregadoGlobal(precioIndividual, nroCuotas, conSenia);

    return {
      id: agregado.id,
      nombre: agregado.agregado,
      cuotaIndividual: individual.cuota,
      cuotaGrupal: grupal.cuota,
      seniaIndividual: individual.senia,
      seniaGrupal: grupal.senia,
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
      next: (beneficios) => this.beneficiosDisponibles.set(beneficios),
    });
  }

  private obtenerPlanesDisponibles(): void
  {
    this.productosService.obtenerPlanesDisponibles().subscribe({
      next: (planes) => {
        this.planesDisponibles.set(planes);
      },
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
    return { idBeneficio: 0, cantidad: 1 };
  }

  abrirEdicionBeneficio(): void
  {
    const presupuesto = this.presupuestoGrupo();
    if (!presupuesto) return;

    this.beneficiosSeleccionadosEdicion.set(
      (presupuesto.beneficios ?? []).map((b) => ({ id_beneficio: b.id_beneficio, beneficio: b.beneficio, cantidad: b.cantidad })),
    );
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
    const idBeneficio = Number(this.beneficioEnEdicionForm.idBeneficio);
    const cantidad = Number(this.beneficioEnEdicionForm.cantidad);
    const catalogo = this.beneficiosDisponibles().find((beneficio) => beneficio.id === idBeneficio);
    if (!catalogo || cantidad < 1) return;

    this.beneficiosSeleccionadosEdicion.update((beneficios) => {
      const indice = beneficios.findIndex((beneficio) => beneficio.id_beneficio === idBeneficio);
      if (indice === -1) return [...beneficios, { id_beneficio: idBeneficio, beneficio: catalogo.beneficio, cantidad }];

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
    return formatearBeneficios(this.beneficiosSeleccionadosEdicion());
  }

  guardarEdicionBeneficio(): void
  {
    const presupuesto = this.presupuestoGrupo();
    const idPedido = presupuesto?.pedido.id;
    if (!presupuesto || !idPedido) return;

    const beneficios: BeneficioPedidoPostDTO[] = this.beneficiosSeleccionadosEdicion()
      .map((beneficio) => ({ id_beneficio: beneficio.id_beneficio, cantidad: beneficio.cantidad }));

    this.guardandoBeneficio.set(true);
    this.gestionPedidosService.modificarBeneficios(beneficios, idPedido).subscribe({
      next: () => {
        this.guardandoBeneficio.set(false);
        this.notificaciones.success({
          title: 'Beneficios actualizados',
          description: 'Los beneficios del pedido se modificaron correctamente.',
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

  //--- Productos y plan de cuotas ---

  private crearProductoEnEdicionPlan()
  {
    return { idProducto: 0, cantidad: 0, agregados: [] as number[] };
  }

  private productoPedidoAProductoCarrito(producto: ProductoPedidoResponseConNombreOriginalDTO, cuotas: number, conSenia: boolean): ProductoCarrito
  {
    // Agregados guardados con su precio; los pedidos viejos solo los tienen en la descripción (se toma el precio del catálogo)
    const guardados = producto.agregados ?? [];
    let agregados: number[];
    let preciosAgregados: Record<number, number>;
    if (guardados.length)
    {
      agregados = guardados.map((agregado) => agregado.id_agregado);
      preciosAgregados = Object.fromEntries(guardados.map((agregado) => [agregado.id_agregado, Number(agregado.precio)]));
    }
    else
    {
      const [, ...nombresExtras] = producto.descripcion.split(SEPARADOR_AGREGADOS);
      agregados = this.agregadosIndividuales()
        .filter((extra) => nombresExtras.includes(extra.agregado))
        .map((extra) => extra.id);
      preciosAgregados = this.preciosAgregados(agregados);
    }

    return {
      idProducto: producto.id_producto_original,
      nombre: producto.nombreProductoOriginal,
      descripcion: producto.descripcion,
      cantidad: producto.cantidad,
      cuotas,
      conSenia,
      valorSenia: producto.valor_senia,
      valorCuota: producto.valor_cuota,
      agregados,
      preciosAgregados,
    };
  }

  // Precio cobrado de cada agregado individual: el guardado (previos) o, si se agrega ahora, el del catálogo
  private preciosAgregados(ids: number[], previos: Record<number, number> = {}): Record<number, number>
  {
    const precios: Record<number, number> = {};
    for (const id of ids)
    {
      precios[id] = previos[id] ?? Number(this.agregadosIndividuales().find((agregado) => agregado.id === id)?.precio ?? 0);
    }
    return precios;
  }

  private costoAgregados(producto: { agregados: number[]; preciosAgregados: Record<number, number> }): number
  {
    return producto.agregados.reduce((total, id) => total + Number(producto.preciosAgregados[id] ?? 0), 0);
  }

  private agregadosAPost(producto: ProductoCarrito): AgregadoProductoPedidoDTO[]
  {
    return producto.agregados.map((id) => ({
      id_agregado: id,
      agregado: this.agregadosIndividuales().find((agregado) => agregado.id === id)?.agregado ?? '',
      precio: Number(producto.preciosAgregados[id] ?? 0),
    }));
  }

  abrirEdicionPlan(): void
  {
    const presupuesto = this.presupuestoGrupo();
    if (!presupuesto) return;

    const cuotas = presupuesto.nroCuotas;
    const conSenia = presupuesto.pedido.con_senia;
    this.carritoEdicionPlan.set(
      presupuesto.productosPedido.map((producto) => this.productoPedidoAProductoCarrito(producto, cuotas, conSenia)),
    );
    this.banderaSeleccionadaPlan = this.bandera()
      ? presupuesto.agregadosGlobales.some((agregado) => agregado.id_agregado === this.bandera()!.id)
      : false;
    this.cuotasPlanSeleccionadas.set(cuotas);
    this.conSeniaPlanSeleccionada.set(conSenia);
    this.planOriginalEdicion.set({ cuotas, conSenia });
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

  cambiarCuotasPlan(clave: string): void
  {
    const plan = planDesdeClave(clave);
    if (!plan) return;
    const nuevasCuotas = plan.cuotas;
    this.cuotasPlanSeleccionadas.set(plan.cuotas);
    this.conSeniaPlanSeleccionada.set(plan.conSenia);

    const productos = this.carritoEdicionPlan();
    if (!productos.length) return;

    const recalculos = productos.map((producto) =>
      this.productosService
        .obtenerPrecioBeneficioProducto(
          producto.idProducto,
          nuevasCuotas,
          producto.cantidad + this.sinCargoProducto(producto.idProducto),
          plan.conSenia,
        )
        .pipe(
          map((precio) => {
            const costoExtras = this.costoAgregados(producto);
            return {
              ...producto,
              cuotas: nuevasCuotas,
              conSenia: plan.conSenia,
              ...preciosConAgregados(precio, costoExtras, nuevasCuotas, plan.conSenia),
            };
          }),
        ),
    );

    const solicitud = ++this.solicitudRecalculoPlan;
    forkJoin(recalculos).subscribe({
      next: (actualizados) => { if (solicitud === this.solicitudRecalculoPlan) this.carritoEdicionPlan.set(actualizados); },
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
    const conSenia = this.conSeniaPlanSeleccionada();
    if (!idProducto || !cantidad || !cuotas)
    {
      this.productoCalculadoPlan.set(null);
      return;
    }

    const cantidadTramo = Number(cantidad) + this.sinCargoProducto(Number(idProducto));
    // Solo vale la respuesta del último cálculo pedido (las viejas se ignoran)
    const solicitud = ++this.solicitudCalculoPlan;
    this.productosService.obtenerPrecioBeneficioProducto(idProducto, cuotas, cantidadTramo, conSenia).subscribe({
      next: (precio) => {
        if (solicitud !== this.solicitudCalculoPlan) return;
        const producto = this.productosParaElegir().find((item) => item.id_producto === idProducto);
        const extras = this.agregadosIndividuales().filter((item) => agregados.includes(item.id));
        // Si se está editando una línea que ya existía, sus agregados conservan el precio cobrado
        const indiceEdicion = this.indiceEdicionProductoPlan();
        const previos = indiceEdicion !== null ? this.carritoEdicionPlan()[indiceEdicion]?.preciosAgregados : undefined;
        const preciosAgregados = this.preciosAgregados(agregados, previos);
        const costoExtras = this.costoAgregados({ agregados, preciosAgregados });
        const nombresExtras = extras.map((item) => item.agregado);
        this.productoCalculadoPlan.set({
          idProducto,
          nombre: producto?.nombre ?? 'Producto',
          descripcion: [producto?.descripcion, ...nombresExtras].filter(Boolean).join(' · Agregado: '),
          cantidad,
          cuotas,
          conSenia,
          ...preciosConAgregados(precio, costoExtras, cuotas, conSenia),
          agregados,
          preciosAgregados,
        });
      },
      error: () => {
        if (solicitud !== this.solicitudCalculoPlan) return;
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

  etiquetaCuotasProducto(producto: ProductoCarrito): string
  {
    return etiquetaPlan(producto.cuotas, producto.conSenia);
  }

  // Clave del plan para el <select> (cuotas + seña)
  clavePlan(plan: PlanCuotas): string
  {
    return clavePlan(plan);
  }

  etiquetaPlanCatalogo(plan: PlanCuotas): string
  {
    const activo = this.planesDisponibles().some((p) => clavePlan(p) === clavePlan(plan));
    return etiquetaPlan(plan.cuotas, plan.conSenia) + (activo ? '' : ' (desactivado)');
  }

  // Si el pedido ya tenía la bandera se mantiene el precio con que se cobró; si se agrega ahora, va el del catálogo
  precioBanderaPlan(): number
  {
    const bandera = this.bandera();
    if (!bandera) return 0;
    const guardada = this.presupuestoGrupo()?.agregadosGlobales.find((agregado) => agregado.id_agregado === bandera.id);
    return guardada ? Number(guardada.precio) : Number(bandera.precio);
  }

  totalSeniaPlan(): number
  {
    const productos = this.carritoEdicionPlan().reduce((total, producto) => total + producto.valorSenia * producto.cantidad, 0);
    // En pesos enteros, igual que la guarda modificar_plan_pedido
    return Math.round(productos + this.parteBanderaPlan().senia);
  }

  // Parte de la bandera en la seña y en cada cuota del plan elegido (en cuotas iguales también va en la seña)
  private parteBanderaPlan(): { cuota: number; senia: number }
  {
    const cuotas = this.cuotasPlanSeleccionadas();
    if (!this.banderaSeleccionadaPlan || !this.bandera() || !cuotas) return { cuota: 0, senia: 0 };
    return parteAgregadoGlobal(this.precioBanderaPlan(), cuotas, this.conSeniaPlanSeleccionada());
  }

  totalCuotasPlanSinDescuento(): number
  {
    const productos = this.carritoEdicionPlan().reduce(
      (total, producto) => total + producto.valorCuota * producto.cantidad,
      0,
    );
    // La bandera se cobra una vez, repartida entre los pagos del plan
    return productos + this.parteBanderaPlan().cuota;
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

    const dto: ModificarPlanPedidoDTO = {
      id_pedido: idPedido,
      productos: productos.map((producto) => ({
        id_pedido: idPedido,
        id_producto_original: producto.idProducto,
        descripcion: producto.descripcion,
        valor_senia: producto.valorSenia,
        valor_cuota: producto.valorCuota,
        cantidad: producto.cantidad,
        agregados: this.agregadosAPost(producto),
      })),
      agregadosGlobales:
        this.banderaSeleccionadaPlan && this.bandera() ? [{ id_agregado: this.bandera()!.id, precio: this.precioBanderaPlan() }] : [],
      nueva_cantidad_cuotas: this.cuotasPlanSeleccionadas(),
      valor_cuota_nuevo: this.totalCuotasPlan(),
      valor_senia_nuevo: this.totalSeniaPlan(),
      con_senia: this.conSeniaPlanSeleccionada(),
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
