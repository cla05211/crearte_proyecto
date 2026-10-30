import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { GestionPedidosService } from '../../services/gestionPedidos/gestion-pedidos-service';
import { NotificationService } from '../../shared/notifications/notification.service';
import {
  AuditoriaPaginaDTO, AuditoriaRegistroDTO, BeneficioAuditoria, DisenioAuditoria,
  PrendaAuditoria, PresupuestoAuditoria, TipoAuditoria,
} from '../../services/gestionPedidos/dto/AuditoriaDTO';

const TAMANIO_PAGINA = 20;
// Si hay muchas inscripciones cambiadas se muestran las primeras y "y N más"
const MAXIMO_INSCRIPCIONES_VISIBLES = 40;

type FilaComparacion = { concepto: string; antes: string; despues: string; cambio: boolean; destacado?: boolean };
type FilaBeneficio = { beneficio: string; antes: number; despues: number; estado: 'agregado' | 'quitado' | 'modificado' | 'igual' };
type FilaTalle = { producto: string; talle: string; antes: number; despues: number; diferencia: number };

type DetallePresupuesto = { tipo: 'presupuesto'; filas: FilaComparacion[]; diferenciaTotal: number | null };
type DetalleBeneficios = { tipo: 'beneficios'; filas: FilaBeneficio[] };
type DetalleDisenio = { tipo: 'disenio'; nombre: string; tieneAnterior: boolean; tieneNuevo: boolean };
type DetalleTalles = {
  tipo: 'talles';
  // 'ambos' = hay antes y después para comparar; si no, se muestra la foto que haya
  lados: 'ambos' | 'antes' | 'despues' | 'ninguno';
  filas: FilaTalle[];
  totalAntes: number;
  totalDespues: number;
  agregadas: PrendaAuditoria[];
  quitadas: PrendaAuditoria[];
  inscripcionesOcultas: number;
};
type Detalle = DetallePresupuesto | DetalleBeneficios | DetalleDisenio | DetalleTalles;

type FilaAuditoria = AuditoriaRegistroDTO & { detalle: Detalle; resumen: string };

@Component({
  selector: 'app-auditoria',
  imports: [DatePipe, FormsModule],
  templateUrl: './auditoria.html',
  styleUrl: './auditoria.css',
})
export class Auditoria implements OnInit
{
  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly notificaciones = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly TAMANIO_PAGINA = TAMANIO_PAGINA;
  readonly tipos: { valor: TipoAuditoria | null; etiqueta: string }[] = [
    { valor: null, etiqueta: 'Todos' },
    { valor: 'presupuesto', etiqueta: 'Presupuesto' },
    { valor: 'beneficios', etiqueta: 'Beneficios' },
    { valor: 'disenio', etiqueta: 'Diseño' },
    { valor: 'talles', etiqueta: 'Talles' },
  ];

  readonly tipoSeleccionado = signal<TipoAuditoria | null>(null);
  readonly busquedaInput = signal('');
  readonly busqueda = signal('');
  readonly pagina = signal(0);

  readonly filas = signal<FilaAuditoria[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly expandidos = signal<Set<number>>(new Set());
  readonly descargando = signal<string | null>(null);

  private readonly solicitud$ = new Subject<void>();
  private readonly busquedaCambiada$ = new Subject<string>();

  private readonly moneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });

  ngOnInit(): void
  {
    this.solicitud$
      .pipe(
        switchMap(() => {
          this.cargando.set(true);
          const desde = this.pagina() * TAMANIO_PAGINA;
          return this.gestionPedidosService
            .obtenerAuditoria(desde, desde + TAMANIO_PAGINA - 1, {
              tipo: this.tipoSeleccionado() ?? undefined,
              busqueda: this.busqueda() || undefined,
            })
            .pipe(catchError(() => {
              this.notificaciones.error({ title: 'No se pudo cargar la auditoría', description: 'Intentá nuevamente en unos minutos.' });
              return of<AuditoriaPaginaDTO>({ registros: [], total: 0 });
            }));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((pagina) => {
        this.filas.set(pagina.registros.map((r) => this.armarFila(r)));
        this.total.set(pagina.total);
        this.expandidos.set(new Set());
        this.cargando.set(false);
      });

    this.busquedaCambiada$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => {
        this.busqueda.set(valor.trim());
        this.irAPrimeraPagina();
      });

    this.solicitud$.next();
  }

  //--- Filtros y paginación ---

  elegirTipo(tipo: TipoAuditoria | null): void
  {
    if (this.tipoSeleccionado() === tipo) return;
    this.tipoSeleccionado.set(tipo);
    this.irAPrimeraPagina();
  }

  actualizarBusqueda(valor: string): void
  {
    this.busquedaInput.set(valor);
    this.busquedaCambiada$.next(valor);
  }

  paginaAnterior(): void
  {
    if (this.pagina() === 0) return;
    this.pagina.update((p) => p - 1);
    this.solicitud$.next();
  }

  paginaSiguiente(): void
  {
    if (!this.hayMasPaginas()) return;
    this.pagina.update((p) => p + 1);
    this.solicitud$.next();
  }

  hayMasPaginas(): boolean
  {
    return (this.pagina() + 1) * TAMANIO_PAGINA < this.total();
  }

  private irAPrimeraPagina(): void
  {
    this.pagina.set(0);
    this.solicitud$.next();
  }

  //--- Detalle ---

  alternarDetalle(id: number): void
  {
    this.expandidos.update((actuales) => {
      const nuevos = new Set(actuales);
      if (nuevos.has(id)) nuevos.delete(id); else nuevos.add(id);
      return nuevos;
    });
  }

  async descargarArchivo(fila: FilaAuditoria, version: 'anterior' | 'nuevo'): Promise<void>
  {
    const clave = `${fila.id}-${version}`;
    this.descargando.set(clave);

    try
    {
      const { url } = await firstValueFrom(this.gestionPedidosService.obtenerUrlArchivoAuditoria(fila.id, version));
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.click();
    }
    catch
    {
      this.notificaciones.error({ title: 'Error', description: 'No se pudo descargar el archivo.' });
    }
    finally
    {
      this.descargando.set(null);
    }
  }

  etiquetaTipo(tipo: TipoAuditoria): string
  {
    return this.tipos.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
  }

  //--- Armado de cada fila (se calcula una vez al cargar la página) ---

  private armarFila(registro: AuditoriaRegistroDTO): FilaAuditoria
  {
    const detalle = this.armarDetalle(registro);
    return { ...registro, detalle, resumen: this.armarResumen(detalle) };
  }

  private armarDetalle(registro: AuditoriaRegistroDTO): Detalle
  {
    switch (registro.tipo)
    {
      case 'presupuesto':
        return this.compararPresupuesto(registro.datoAnterior as PresupuestoAuditoria | null, registro.datoNuevo as PresupuestoAuditoria | null);
      case 'beneficios':
        return this.compararBeneficios(registro.datoAnterior as BeneficioAuditoria[] | null, registro.datoNuevo as BeneficioAuditoria[] | null);
      case 'disenio':
        return this.armarDisenio(registro.datoAnterior as DisenioAuditoria | null, registro.datoNuevo as DisenioAuditoria | null);
      case 'talles':
        return this.compararTalles(registro.datoAnterior as PrendaAuditoria[] | null, registro.datoNuevo as PrendaAuditoria[] | null);
    }
  }

  private armarResumen(detalle: Detalle): string
  {
    switch (detalle.tipo)
    {
      case 'presupuesto':
      {
        if (detalle.diferenciaTotal === null || detalle.diferenciaTotal === 0) return 'Sin cambio en el total';
        const signo = detalle.diferenciaTotal > 0 ? '+' : '−';
        return `Total ${signo}${this.moneda.format(Math.abs(detalle.diferenciaTotal))}`;
      }
      case 'beneficios':
      {
        const cambios = detalle.filas.filter((f) => f.estado !== 'igual');
        return cambios.length ? cambios.map((f) => `${f.estado === 'quitado' ? '−' : f.estado === 'agregado' ? '+' : '±'} ${f.beneficio}`).join(', ') : 'Sin cambios';
      }
      case 'disenio':
        return detalle.nombre;
      case 'talles':
      {
        if (detalle.lados !== 'ambos') return `${detalle.lados === 'antes' ? detalle.totalAntes : detalle.totalDespues} prendas`;
        const cambios = detalle.agregadas.length + detalle.quitadas.length + detalle.inscripcionesOcultas;
        if (!cambios) return 'Sin cambios';
        return `${detalle.totalAntes} → ${detalle.totalDespues} prendas`;
      }
    }
  }

  private compararPresupuesto(antes: PresupuestoAuditoria | null, despues: PresupuestoAuditoria | null): DetallePresupuesto
  {
    const filas: FilaComparacion[] = [];
    const nombres = [...new Set([...(antes?.productos ?? []), ...(despues?.productos ?? [])].map((p) => p.nombre))];

    for (const nombre of nombres)
    {
      const a = antes?.productos.find((p) => p.nombre === nombre);
      const d = despues?.productos.find((p) => p.nombre === nombre);
      const textoA = a ? this.textoProducto(a) : '—';
      const textoD = d ? this.textoProducto(d) : '—';
      filas.push({ concepto: nombre, antes: textoA, despues: textoD, cambio: textoA !== textoD });
    }

    const agregar = (concepto: string, valorA: string | undefined, valorD: string | undefined, destacado = false) =>
      filas.push({ concepto, antes: valorA ?? '—', despues: valorD ?? '—', cambio: (valorA ?? '') !== (valorD ?? ''), destacado });

    const agregados = (p: PresupuestoAuditoria | null) => p ? (p.agregados.length ? p.agregados.join(', ') : 'Ninguno') : undefined;
    const plata = (valor: number | undefined) => valor === undefined ? undefined : this.moneda.format(valor);

    agregar('Agregados', agregados(antes), agregados(despues));
    agregar('Cantidad de cuotas', antes?.nroCuotas.toString(), despues?.nroCuotas.toString());
    agregar('Seña total', plata(antes?.senia), plata(despues?.senia));
    agregar('Total en cuotas', plata(antes?.totalCuotas), plata(despues?.totalCuotas));
    agregar('Total del pedido', plata(antes?.total), plata(despues?.total), true);

    return { tipo: 'presupuesto', filas, diferenciaTotal: antes && despues ? Math.round((despues.total - antes.total) * 100) / 100 : null };
  }

  private textoProducto(p: { cantidad: number; valorSenia: number; valorCuota: number }): string
  {
    return `${p.cantidad} u. · seña ${this.moneda.format(p.valorSenia)} · cuota ${this.moneda.format(p.valorCuota)}`;
  }

  private compararBeneficios(antes: BeneficioAuditoria[] | null, despues: BeneficioAuditoria[] | null): DetalleBeneficios
  {
    const nombres = [...new Set([...(antes ?? []), ...(despues ?? [])].map((b) => b.beneficio))].sort();

    const filas: FilaBeneficio[] = nombres.map((beneficio) => {
      const a = antes?.filter((b) => b.beneficio === beneficio).reduce((t, b) => t + b.cantidad, 0) ?? 0;
      const d = despues?.filter((b) => b.beneficio === beneficio).reduce((t, b) => t + b.cantidad, 0) ?? 0;
      const tenia = !!antes?.some((b) => b.beneficio === beneficio);
      const tiene = !!despues?.some((b) => b.beneficio === beneficio);
      const estado = !tenia ? 'agregado' : !tiene ? 'quitado' : a !== d ? 'modificado' : 'igual';
      return { beneficio, antes: a, despues: d, estado };
    });

    return { tipo: 'beneficios', filas };
  }

  private armarDisenio(antes: DisenioAuditoria | null, despues: DisenioAuditoria | null): DetalleDisenio
  {
    const tipo = despues?.tipo ?? antes?.tipo ?? '';
    const esFirmado = tipo.startsWith('Firma ');
    const nombre = tipo.replace(/^Firma /, '').replace(/^Disenio /, '') || 'Diseño';

    return {
      tipo: 'disenio',
      nombre: esFirmado ? `${nombre} (firmado)` : `${nombre} (boceto)`,
      tieneAnterior: !!antes?.archivo?.ruta,
      tieneNuevo: !!despues?.archivo?.ruta,
    };
  }

  private compararTalles(antes: PrendaAuditoria[] | null, despues: PrendaAuditoria[] | null): DetalleTalles
  {
    const lados = antes && despues ? 'ambos' : antes ? 'antes' : despues ? 'despues' : 'ninguno';

    const contar = (prendas: PrendaAuditoria[] | null, clave: (p: PrendaAuditoria) => string) => {
      const mapa = new Map<string, number>();
      for (const p of prendas ?? []) mapa.set(clave(p), (mapa.get(clave(p)) ?? 0) + 1);
      return mapa;
    };

    // Cantidades por prenda y talle
    const claveTalle = (p: PrendaAuditoria) => `${p.producto}\u0000${p.talle}`;
    const porTalleAntes = contar(antes, claveTalle);
    const porTalleDespues = contar(despues, claveTalle);
    const clavesTalle = [...new Set([...porTalleAntes.keys(), ...porTalleDespues.keys()])].sort((a, b) => a.localeCompare(b));

    let filas: FilaTalle[] = clavesTalle.map((clave) => {
      const [producto, talle] = clave.split('\u0000');
      const a = porTalleAntes.get(clave) ?? 0;
      const d = porTalleDespues.get(clave) ?? 0;
      return { producto, talle, antes: a, despues: d, diferencia: d - a };
    });

    // Comparando, solo interesan los talles que cambiaron
    if (lados === 'ambos') filas = filas.filter((f) => f.diferencia !== 0);

    // Inscripciones (nombres) que aparecen o desaparecen: detecta cambios aunque el total por talle sea igual
    const agregadas: PrendaAuditoria[] = [];
    const quitadas: PrendaAuditoria[] = [];

    if (lados === 'ambos')
    {
      const clave = (p: PrendaAuditoria) => `${p.producto}\u0000${p.talle}\u0000${p.inscripcion ?? ''}`;
      const cantAntes = contar(antes, clave);
      const cantDespues = contar(despues, clave);

      for (const k of new Set([...cantAntes.keys(), ...cantDespues.keys()]))
      {
        const [producto, talle, inscripcion] = k.split('\u0000');
        const prenda = { producto, talle, inscripcion: inscripcion || null };
        const diferencia = (cantDespues.get(k) ?? 0) - (cantAntes.get(k) ?? 0);
        for (let i = 0; i < Math.abs(diferencia); i++) (diferencia > 0 ? agregadas : quitadas).push(prenda);
      }
    }

    const ordenar = (lista: PrendaAuditoria[]) => lista.sort((a, b) =>
      a.producto.localeCompare(b.producto) || a.talle.localeCompare(b.talle) || (a.inscripcion ?? '').localeCompare(b.inscripcion ?? ''));

    const totalCambios = agregadas.length + quitadas.length;
    const ocultas = Math.max(0, totalCambios - MAXIMO_INSCRIPCIONES_VISIBLES);
    const visiblesQuitadas = ordenar(quitadas).slice(0, MAXIMO_INSCRIPCIONES_VISIBLES);
    const visiblesAgregadas = ordenar(agregadas).slice(0, Math.max(0, MAXIMO_INSCRIPCIONES_VISIBLES - visiblesQuitadas.length));

    return {
      tipo: 'talles',
      lados,
      filas,
      totalAntes: antes?.length ?? 0,
      totalDespues: despues?.length ?? 0,
      agregadas: visiblesAgregadas,
      quitadas: visiblesQuitadas,
      inscripcionesOcultas: ocultas,
    };
  }
}
