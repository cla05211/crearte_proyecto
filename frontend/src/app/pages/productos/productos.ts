import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProductosService } from '../../services/productos/productos-service';
import { ProductoConPrecioResponseDTO } from '../../services/productos/dto/ProductoConPrecioResponse';
import { ModificarProductoPreciosDTO } from '../../services/productos/dto/ModificarProductoPrecios.dto';
import { AgregarPlanDTO } from '../../services/productos/dto/AgregarPlanDTO';
import { etiquetaPlan } from '../../services/cuotas/plan-cuotas';
import { NotificationService } from '../../shared/notifications/notification.service';
import { ConfirmationService } from '../../services/confirmation/confirmation.service';

type Pestania = 'precios' | 'planes';
type PrecioFila = ProductoConPrecioResponseDTO;

interface Plan
{
  clave: string;      // "cuotas-conSenia"
  cuotas: number;     // como se guarda en precios_productos
  conSenia: boolean;
  activo: boolean;
  etiqueta: string;
}

interface CambioPrecio
{
  valorCuota: number | null;
  valorSenia: number | null;
}

// Familias de productos que comparten precio. El alta de plan pide un precio por familia
// y el back lo replica en todos sus productos.
interface Familia
{
  clave: string;          // parte del nombre de los campos de AgregarPlanDTO
  titulo: string;
  detalle: string;
  ids: number[];          // productos que comparten precio (el primero es la referencia)
  tramos: string[];       // sufijos de los campos del DTO
}

const TRAMOS = ['20a25', '26a40', '41a55'];
const ETIQUETA_TRAMO: Record<string, string> = {
  '20a25': 'Hasta 25',
  '26a40': '26 a 40',
  '41a55': '41 o más',
  '20a55': 'Cualquier cantidad',
};

const FAMILIAS: Familia[] = [
  { clave: 'Campera', titulo: 'Buzo y Campera', detalle: 'Mismo precio para buzo y campera', ids: [63, 64], tramos: TRAMOS },
  { clave: 'Chomba', titulo: 'Remera y Chomba', detalle: 'Un solo precio para cualquier cantidad', ids: [65, 66], tramos: ['20a55'] },
  { clave: 'Combo', titulo: 'Combo: Buzo/Campera + Chomba/Remera', detalle: 'Mismo precio para los 4 combos', ids: [67, 68, 69, 70], tramos: TRAMOS },
  { clave: 'CamperaUniversitaria', titulo: 'Campera universitaria', detalle: '', ids: [71], tramos: TRAMOS },
  { clave: 'Joggin', titulo: 'Pantalón jogging', detalle: '', ids: [72], tramos: TRAMOS },
];

// Productos que se editan juntos en la pestaña Precios (una familia, o un producto suelto)
interface GrupoPrecio
{
  clave: string;
  titulo: string;
  ids: number[];          // el primero es la referencia que se muestra en la tabla
  nombres: string[];
}

@Component({
  selector: 'app-productos',
  imports: [FormsModule],
  templateUrl: './productos.html',
  styleUrl: './productos.css',
})
export class Productos implements OnInit
{
  private readonly productosService = inject(ProductosService);
  private readonly notificaciones = inject(NotificationService);
  private readonly confirmacion = inject(ConfirmationService);

  readonly familias = FAMILIAS;
  readonly etiquetaTramo = ETIQUETA_TRAMO;

  pestania = signal<Pestania>('precios');
  cargando = signal(true);
  errorCarga = signal('');
  precios = signal<PrecioFila[]>([]);

  // ───────────────────────── Planes ─────────────────────────

  readonly planes = computed<Plan[]>(() =>
  {
    const mapa = new Map<string, Plan>();
    for (const fila of this.precios())
    {
      const clave = this.clavePlan(fila.cuotas, fila.con_senia);
      const plan = mapa.get(clave);
      if (plan) plan.activo = plan.activo || fila.activo;
      else mapa.set(clave, {
        clave,
        cuotas: fila.cuotas,
        conSenia: fila.con_senia,
        activo: fila.activo,
        etiqueta: etiquetaPlan(fila.cuotas, fila.con_senia),
      });
    }
    return [...mapa.values()].sort((a, b) => this.ordenPlan(a) - this.ordenPlan(b));
  });

  readonly planesActivos = computed(() => this.planes().filter(p => p.activo).length);
  planCambiando = signal<string | null>(null);

  // ───────────────────────── Precios ─────────────────────────

  // Las familias que comparten precio se editan como un solo grupo; un producto que no
  // esté en ninguna familia (por ejemplo, uno nuevo) aparece solo
  readonly grupos = computed<GrupoPrecio[]>(() =>
  {
    const nombres = new Map<number, string>();
    for (const fila of this.precios()) nombres.set(fila.id_producto, fila.nombre);

    const grupos: GrupoPrecio[] = [];
    const usados = new Set<number>();
    for (const familia of FAMILIAS)
    {
      const ids = familia.ids.filter(id => nombres.has(id));
      if (!ids.length) continue;
      ids.forEach(id => usados.add(id));
      grupos.push({ clave: familia.clave, titulo: familia.titulo, ids, nombres: ids.map(id => nombres.get(id)!) });
    }
    for (const [id, nombre] of [...nombres.entries()].sort((a, b) => a[0] - b[0]))
      if (!usados.has(id)) grupos.push({ clave: `producto-${id}`, titulo: nombre, ids: [id], nombres: [nombre] });

    return grupos;
  });

  grupoSeleccionado = signal<string | null>(null);
  readonly grupoActual = computed(() => this.grupos().find(g => g.clave === this.grupoSeleccionado()) ?? null);
  // La tabla muestra los precios del primer producto del grupo
  private readonly idReferencia = computed(() => this.grupoActual()?.ids[0] ?? null);

  // Tramos (cantidad_desde/hasta) del producto elegido, en orden
  readonly tramosProducto = computed(() =>
  {
    const tramos = new Map<number, number>();
    for (const fila of this.filasProducto(this.idReferencia()))
      tramos.set(fila.cantidad_desde, fila.cantidad_hasta);
    return [...tramos.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([desde, hasta]) => ({ desde, hasta, etiqueta: this.etiquetaRango(desde, hasta) }));
  });

  // Planes con precio para el producto elegido
  readonly planesProducto = computed(() =>
  {
    const claves = new Set(this.filasProducto(this.idReferencia()).map(f => this.clavePlan(f.cuotas, f.con_senia)));
    return this.planes().filter(p => claves.has(p.clave));
  });

  cambios = signal(new Map<number, CambioPrecio>());   // id de fila -> valores editados
  readonly cantidadCambios = computed(() => this.cambios().size);
  guardandoPrecios = signal(false);

  // Diferencias de cada producto del grupo con el de referencia:
  //  - distintos: misma fila (plan + tramo) con otro precio → se puede igualar
  //  - sinPar: filas que existen en uno y no en el otro → no se puede igualar desde acá
  readonly desparejos = computed(() =>
  {
    const grupo = this.grupoActual();
    if (!grupo || grupo.ids.length < 2) return [];
    const referencia = this.filasProducto(grupo.ids[0]);

    return grupo.ids.slice(1).map(id =>
    {
      const filas = this.filasProducto(id);
      const distintos: { id: number; valorCuota: number; valorSenia: number }[] = [];
      let sinPar = 0;
      for (const ref of referencia)
      {
        const otra = this.equivalente(filas, ref);
        if (!otra) sinPar++;
        else if (Number(otra.valor_cuota) !== Number(ref.valor_cuota) || Number(otra.valor_senia) !== Number(ref.valor_senia))
          distintos.push({ id: otra.id, valorCuota: Number(ref.valor_cuota), valorSenia: Number(ref.valor_senia) });
      }
      sinPar += filas.filter(f => !this.equivalente(referencia, f)).length;
      return { idProducto: id, nombre: grupo.nombres[grupo.ids.indexOf(id)], distintos, sinPar };
    }).filter(d => d.distintos.length || d.sinPar);
  });

  readonly preciosParaIgualar = computed(() => this.desparejos().reduce((t, d) => t + d.distintos.length, 0));
  readonly hayFilasSinPar = computed(() => this.desparejos().some(d => d.sinPar > 0));
  igualando = signal(false);

  readonly cambiosInvalidos = computed(() =>
    [...this.cambios().values()].some(c => !this.esPrecioValido(c.valorCuota) || !this.esPrecioValido(c.valorSenia)));

  async igualarPrecios(): Promise<void>
  {
    const grupo = this.grupoActual();
    const pendientes = this.desparejos().filter(d => d.distintos.length);
    if (!grupo || !pendientes.length) return;

    const confirmar = await this.confirmacion.confirm({
      title: 'Igualar precios del grupo',
      description: `Se copian los precios de ${grupo.nombres[0]} a ${pendientes.map(d => d.nombre).join(', ')} (${this.preciosParaIgualar()} precio${this.preciosParaIgualar() === 1 ? '' : 's'}).`,
    });
    if (!confirmar) return;

    this.igualando.set(true);
    forkJoin(pendientes.map(d => this.productosService.modificarPreciosProducto(
      d.idProducto,
      d.distintos.map(c => ({ id: c.id, valorCuota: c.valorCuota, valorSeña: c.valorSenia })),
    ))).subscribe({
      next: () =>
      {
        this.notificaciones.success({ title: 'Precios igualados', description: `${grupo.titulo} ya tiene los mismos precios en todos sus productos.` });
        this.igualando.set(false);
        this.cargarPrecios();
      },
      error: (err) =>
      {
        console.error(err);
        this.notificaciones.error({ title: 'No se pudieron igualar los precios', description: err?.error?.message ?? 'Probá de nuevo en unos minutos.' });
        this.igualando.set(false);
        this.cargarPrecios();
      },
    });
  }

  // ───────────────────────── Agregar plan ─────────────────────────

  agregandoPlan = signal(false);
  pasoPlan = signal<1 | 2>(1);
  tipoNuevoPlan = signal<'senia' | 'iguales'>('senia');
  pagosNuevoPlan = signal<number | null>(null);   // lo que escribe el usuario (ver cuotasNuevoPlan)
  planACopiar = signal<string>('');
  preciosNuevoPlan = signal<Record<string, number | null>>({});
  guardandoPlan = signal(false);
  intentoGuardarPlan = signal(false);

  readonly nuevoPlanConSenia = computed(() => this.tipoNuevoPlan() === 'senia');

  // En la tabla, "N cuotas iguales" se guarda como N-1 cuotas (la seña es la cuota 1)
  readonly cuotasNuevoPlan = computed(() =>
  {
    const pagos = this.pagosNuevoPlan();
    if (!pagos || pagos < 1 || !Number.isInteger(pagos)) return null;
    const cuotas = this.nuevoPlanConSenia() ? pagos : pagos - 1;
    return cuotas >= 1 ? cuotas : null;
  });

  readonly etiquetaNuevoPlan = computed(() =>
  {
    const cuotas = this.cuotasNuevoPlan();
    return cuotas === null ? '' : etiquetaPlan(cuotas, this.nuevoPlanConSenia());
  });

  readonly nuevoPlanRepetido = computed(() =>
  {
    const cuotas = this.cuotasNuevoPlan();
    if (cuotas === null) return null;
    return this.planes().find(p => p.clave === this.clavePlan(cuotas, this.nuevoPlanConSenia())) ?? null;
  });

  readonly errorPaso1 = computed(() =>
  {
    if (this.pagosNuevoPlan() === null) return 'Ingresá la cantidad de cuotas.';
    if (this.cuotasNuevoPlan() === null)
      return this.nuevoPlanConSenia() ? 'Tiene que haber al menos 1 cuota.' : 'Un plan de cuotas iguales necesita al menos 2 cuotas.';
    const repetido = this.nuevoPlanRepetido();
    if (repetido) return `El plan "${repetido.etiqueta}" ya existe${repetido.activo ? '' : ' (está desactivado: podés activarlo desde la lista)'}.`;
    return '';
  });

  readonly camposNuevoPlan = computed(() =>
  {
    const campos: string[] = [];
    for (const familia of FAMILIAS)
      for (const tramo of familia.tramos)
      {
        campos.push(this.campo('Cuota', familia, tramo));
        if (this.nuevoPlanConSenia()) campos.push(this.campo('Senia', familia, tramo));
      }
    return campos;
  });

  readonly preciosFaltantes = computed(() =>
  {
    const valores = this.preciosNuevoPlan();
    return this.camposNuevoPlan().filter(c => !this.esPrecioValido(valores[c] ?? null)).length;
  });

  // ───────────────────────── Carga ─────────────────────────

  ngOnInit(): void
  {
    this.cargarPrecios();
  }

  cargarPrecios(): void
  {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.productosService.obtenerProductos().subscribe({
      next: (precios) =>
      {
        this.precios.set(precios);
        if (this.grupoActual() === null && this.grupos().length)
          this.grupoSeleccionado.set(this.grupos()[0].clave);
        this.cargando.set(false);
      },
      error: (err) =>
      {
        console.error(err);
        this.errorCarga.set('No se pudieron cargar los productos y precios.');
        this.cargando.set(false);
      },
    });
  }

  async cambiarPestania(pestania: Pestania): Promise<void>
  {
    if (pestania === this.pestania()) return;
    if (!(await this.descartarCambiosSiHay())) return;
    this.pestania.set(pestania);
  }

  // ───────────────────────── Precios: edición ─────────────────────────

  async seleccionarGrupo(clave: string): Promise<void>
  {
    if (clave === this.grupoSeleccionado()) return;
    if (!(await this.descartarCambiosSiHay())) return;
    this.grupoSeleccionado.set(clave);
  }

  celda(plan: Plan, desde: number): PrecioFila | undefined
  {
    return this.filasProducto(this.idReferencia())
      .find(f => f.cuotas === plan.cuotas && f.con_senia === plan.conSenia && f.cantidad_desde === desde);
  }

  valorCuota(fila: PrecioFila): number | null
  {
    const cambio = this.cambios().get(fila.id);
    return cambio ? cambio.valorCuota : fila.valor_cuota;
  }

  valorSenia(fila: PrecioFila): number | null
  {
    const cambio = this.cambios().get(fila.id);
    return cambio ? cambio.valorSenia : fila.valor_senia;
  }

  estaModificada(fila: PrecioFila): boolean
  {
    return this.cambios().has(fila.id);
  }

  editarCuota(fila: PrecioFila, valor: number | null): void
  {
    // En los planes sin seña, la seña es la cuota 1: siempre valen lo mismo
    const senia = fila.con_senia ? this.valorSenia(fila) : valor;
    this.registrarCambio(fila, valor, senia);
  }

  editarSenia(fila: PrecioFila, valor: number | null): void
  {
    this.registrarCambio(fila, this.valorCuota(fila), valor);
  }

  private registrarCambio(fila: PrecioFila, cuota: number | null, senia: number | null): void
  {
    this.cambios.update(mapa =>
    {
      const nuevo = new Map(mapa);
      if (cuota === Number(fila.valor_cuota) && senia === Number(fila.valor_senia)) nuevo.delete(fila.id);
      else nuevo.set(fila.id, { valorCuota: cuota, valorSenia: senia });
      return nuevo;
    });
  }

  descartarCambios(): void
  {
    this.cambios.set(new Map());
  }

  guardarPrecios(): void
  {
    const grupo = this.grupoActual();
    if (!grupo || this.cantidadCambios() === 0 || this.cambiosInvalidos()) return;

    // Los cambios se hicieron sobre las filas del producto de referencia: en los demás
    // productos del grupo se busca la fila equivalente (mismo plan y tramo)
    const filasReferencia = this.filasProducto(grupo.ids[0]);
    const pedidos = grupo.ids.map(idProducto =>
    {
      const filas = this.filasProducto(idProducto);
      const cambiosProducto = new Map<number, CambioPrecio>();
      for (const [idFila, cambio] of this.cambios())
      {
        const original = filasReferencia.find(f => f.id === idFila);
        const fila = original ? this.equivalente(filas, original) : undefined;
        if (fila) cambiosProducto.set(fila.id, cambio);
      }
      return { idProducto, dto: this.armarDtoCambios(filas, cambiosProducto) };
    }).filter(p => p.dto.length > 0);

    this.guardandoPrecios.set(true);
    forkJoin(pedidos.map(p => this.productosService.modificarPreciosProducto(p.idProducto, p.dto))).subscribe({
      next: () =>
      {
        this.notificaciones.success({ title: 'Precios actualizados', description: `Se guardaron los cambios de ${grupo.titulo}.` });
        this.descartarCambios();
        this.guardandoPrecios.set(false);
        this.cargarPrecios();
      },
      error: (err) =>
      {
        console.error(err);
        this.notificaciones.error({ title: 'No se pudieron guardar los precios', description: err?.error?.message ?? 'Probá de nuevo en unos minutos.' });
        this.guardandoPrecios.set(false);
        this.cargarPrecios();   // por si se guardó un producto del grupo y otro no
      },
    });
  }

  private equivalente(filas: PrecioFila[], ref: PrecioFila): PrecioFila | undefined
  {
    return filas.find(f => f.cuotas === ref.cuotas && f.con_senia === ref.con_senia && f.cantidad_desde === ref.cantidad_desde);
  }

  private armarDtoCambios(filas: PrecioFila[], cambios: Map<number, CambioPrecio>): ModificarProductoPreciosDTO[]
  {
    return [...cambios.entries()]
      .filter(([id]) => filas.some(f => f.id === id))
      .map(([id, c]) => ({ id, valorCuota: Number(c.valorCuota), valorSeña: Number(c.valorSenia) }));
  }

  private async descartarCambiosSiHay(): Promise<boolean>
  {
    if (this.cantidadCambios() === 0) return true;
    const confirmar = await this.confirmacion.confirm({
      title: 'Hay cambios sin guardar',
      description: `Modificaste ${this.cantidadCambios()} precio${this.cantidadCambios() === 1 ? '' : 's'} de ${this.grupoActual()?.titulo ?? ''}. Si seguís, se descartan.`,
    });
    if (confirmar) this.descartarCambios();
    return confirmar;
  }

  // ───────────────────────── Planes: activar / desactivar ─────────────────────────

  async cambiarEstadoPlan(plan: Plan): Promise<void>
  {
    const activar = !plan.activo;
    if (!activar)
    {
      const confirmar = await this.confirmacion.confirm({
        title: `Desactivar "${plan.etiqueta}"`,
        description: 'El plan deja de aparecer en las ventas nuevas. Los pedidos que ya lo usan no cambian, y podés volver a activarlo cuando quieras.',
      });
      if (!confirmar) return;
    }

    this.planCambiando.set(plan.clave);
    this.productosService.activarPlan(plan.cuotas, plan.conSenia, activar).subscribe({
      next: () =>
      {
        this.precios.update(filas => filas.map(f =>
          f.cuotas === plan.cuotas && f.con_senia === plan.conSenia ? { ...f, activo: activar } : f));
        this.notificaciones.success({
          title: activar ? 'Plan activado' : 'Plan desactivado',
          description: activar ? `"${plan.etiqueta}" ya se puede usar en ventas nuevas.` : `"${plan.etiqueta}" ya no aparece en ventas nuevas.`,
        });
        this.planCambiando.set(null);
      },
      error: (err) =>
      {
        console.error(err);
        this.notificaciones.error({ title: 'No se pudo cambiar el plan', description: err?.error?.message ?? 'Probá de nuevo en unos minutos.' });
        this.planCambiando.set(null);
      },
    });
  }

  // ───────────────────────── Planes: agregar ─────────────────────────

  abrirAgregarPlan(): void
  {
    this.tipoNuevoPlan.set('senia');
    this.pagosNuevoPlan.set(null);
    this.planACopiar.set('');
    this.preciosNuevoPlan.set({});
    this.pasoPlan.set(1);
    this.intentoGuardarPlan.set(false);
    this.agregandoPlan.set(true);
  }

  async cerrarAgregarPlan(): Promise<void>
  {
    const hayDatos = Object.values(this.preciosNuevoPlan()).some(v => v !== null && v !== undefined);
    if (hayDatos)
    {
      const confirmar = await this.confirmacion.confirm({
        title: 'Descartar el plan nuevo',
        description: 'Los precios que cargaste no se van a guardar.',
      });
      if (!confirmar) return;
    }
    this.agregandoPlan.set(false);
  }

  cambiarTipoNuevoPlan(tipo: 'senia' | 'iguales'): void
  {
    this.tipoNuevoPlan.set(tipo);
  }

  irAPasoPrecios(): void
  {
    if (this.errorPaso1()) return;
    if (this.planACopiar()) this.copiarPrecios(this.planACopiar());
    this.pasoPlan.set(2);
  }

  valorNuevoPlan(campo: string): number | null
  {
    return this.preciosNuevoPlan()[campo] ?? null;
  }

  editarNuevoPlan(campo: string, valor: number | null): void
  {
    this.preciosNuevoPlan.update(v => ({ ...v, [campo]: valor }));
  }

  campo(tipo: 'Cuota' | 'Senia', familia: Familia, tramo: string): string
  {
    return `precio${tipo}${familia.clave}${tramo}`;
  }

  campoInvalido(campo: string): boolean
  {
    return this.intentoGuardarPlan() && !this.esPrecioValido(this.valorNuevoPlan(campo));
  }

  // Precarga los precios del plan elegido (de la referencia de cada familia), tramo por tramo
  private copiarPrecios(clavePlan: string): void
  {
    const plan = this.planes().find(p => p.clave === clavePlan);
    if (!plan) return;

    const valores: Record<string, number | null> = { ...this.preciosNuevoPlan() };
    for (const familia of FAMILIAS)
    {
      const filas = this.filasProducto(familia.ids[0])
        .filter(f => f.cuotas === plan.cuotas && f.con_senia === plan.conSenia)
        .sort((a, b) => a.cantidad_desde - b.cantidad_desde);

      familia.tramos.forEach((tramo, i) =>
      {
        const fila = filas[i];
        if (!fila) return;
        valores[this.campo('Cuota', familia, tramo)] = Number(fila.valor_cuota);
        // La seña solo se copia si el plan de origen también tiene seña aparte
        if (this.nuevoPlanConSenia() && plan.conSenia)
          valores[this.campo('Senia', familia, tramo)] = Number(fila.valor_senia);
      });
    }
    this.preciosNuevoPlan.set(valores);
  }

  guardarPlan(): void
  {
    this.intentoGuardarPlan.set(true);
    const cuotas = this.cuotasNuevoPlan();
    if (cuotas === null || this.errorPaso1() || this.preciosFaltantes() > 0) return;

    const valores = this.preciosNuevoPlan();
    const dto = { cuotas, senia: this.nuevoPlanConSenia() } as Record<string, number | boolean | undefined>;
    for (const campo of this.camposNuevoPlan()) dto[campo] = Number(valores[campo]);

    this.guardandoPlan.set(true);
    this.productosService.agregarPlan(dto as unknown as AgregarPlanDTO).subscribe({
      next: () =>
      {
        this.notificaciones.success({ title: 'Plan agregado', description: `"${this.etiquetaNuevoPlan()}" ya está disponible para ventas nuevas.` });
        this.guardandoPlan.set(false);
        this.agregandoPlan.set(false);
        this.cargarPrecios();
      },
      error: (err) =>
      {
        console.error(err);
        this.notificaciones.error({ title: 'No se pudo agregar el plan', description: err?.error?.message ?? 'Probá de nuevo en unos minutos.' });
        this.guardandoPlan.set(false);
      },
    });
  }

  // ───────────────────────── Helpers ─────────────────────────

  private filasProducto(idProducto: number | null): PrecioFila[]
  {
    if (idProducto === null) return [];
    return this.precios().filter(f => f.id_producto === idProducto);
  }

  private clavePlan(cuotas: number, conSenia: boolean): string
  {
    return `${cuotas}-${conSenia}`;
  }

  // Mismo criterio que talles-diseño: menos pagos primero; a igual cantidad, cuotas iguales antes que seña
  private ordenPlan(plan: { cuotas: number; conSenia: boolean }): number
  {
    return (plan.cuotas + 1) * 2 + (plan.conSenia ? 1 : 0);
  }

  private etiquetaRango(desde: number, hasta: number): string
  {
    if (hasta >= 999) return desde <= 1 ? 'Cualquier cantidad' : `${desde} o más`;
    if (desde <= 1) return `Hasta ${hasta}`;
    return `${desde} a ${hasta}`;
  }

  private esPrecioValido(valor: number | null | undefined): boolean
  {
    return valor !== null && valor !== undefined && !Number.isNaN(Number(valor)) && Number(valor) > 0;
  }
}
