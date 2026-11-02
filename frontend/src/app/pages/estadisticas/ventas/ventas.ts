import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Estadisticas as EstadisticasService } from '../../../services/estadisticas/estadisticas';
import { EstadisticasVentasDTO } from '../../../services/estadisticas/dto/estadisticasVentas.dto';
import { NotificationService } from '../../../shared/notifications/notification.service';

interface VentasVendedora
{
  vendedora: string;
  porMes: number[]; // 12 posiciones, de enero a diciembre
  total: number;
}

interface Barra
{
  etiqueta: string;
  cantidad: number;
  porcentaje: number; // alto/ancho de la barra relativo al máximo (0 a 100)
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const NIVELES = ['Jardin', 'Primaria', 'Secundaria'];

@Component({
  selector: 'app-estadisticas-ventas',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './ventas.html',
  styleUrls: ['../estadisticas-compartido.css', './ventas.css'],
})
export class Ventas implements OnInit
{
  private readonly estadisticasService = inject(EstadisticasService);
  private readonly notificaciones = inject(NotificationService);

  // Tienen que coincidir con lo que calcula el back: promo actual = año en curso, siguiente = año que viene
  readonly anio = new Date().getFullYear();
  readonly promoActual = this.anio;
  readonly promoSiguiente = this.anio + 1;

  readonly datos = signal<EstadisticasVentasDTO[] | null>(null);
  readonly cargando = signal(false);

  // Filtros de la estadística por nivel ('' = todas)
  readonly provincia = signal('');
  readonly localidad = signal('');

  //--- Bases ---

  // Los cancelados no cuentan como vendidos
  private readonly vigentes = computed(() => (this.datos() ?? []).filter((d) => !d.cancelado));

  // El back también trae grupos de otros años por la promo: acá quedan solo los vendidos este año
  readonly vendidosAnio = computed(() => this.vigentes().filter((d) => this.esDelAnio(d.fechaVenta)));

  //--- 1) Vendidos por mes y total del año ---

  readonly totalAnio = computed(() => this.vendidosAnio().length);

  readonly ventasPorMes = computed<Barra[]>(() =>
  {
    const cantidades = new Array(12).fill(0);
    for (const venta of this.vendidosAnio())
    {
      cantidades[new Date(venta.fechaVenta).getMonth()]++;
    }
    return this.armarBarras(MESES.map((mes, i) => ({ etiqueta: mes, cantidad: cantidades[i] })));
  });

  //--- Vendidos por vendedora, por mes y total del año ---

  readonly meses = MESES;

  readonly ventasPorVendedora = computed<VentasVendedora[]>(() =>
  {
    const porVendedora = new Map<string, number[]>();

    for (const venta of this.vendidosAnio())
    {
      const meses = porVendedora.get(venta.vendedora) ?? new Array(12).fill(0);
      meses[new Date(venta.fechaVenta).getMonth()]++;
      porVendedora.set(venta.vendedora, meses);
    }

    // La que más vendió arriba; si empatan, por nombre
    return [...porVendedora.entries()]
      .map(([vendedora, porMes]) => ({ vendedora, porMes, total: porMes.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total || a.vendedora.localeCompare(b.vendedora, 'es'));
  });

  // Fila de totales: suma de todas las vendedoras por mes
  readonly totalesPorMes = computed(() =>
    this.ventasPorMes().map((mes) => mes.cantidad),
  );

  //--- 2) Promo actual y siguiente (sin importar el año de venta) ---

  readonly cantidadPromoActual = computed(() => this.vigentes().filter((d) => d.promo === this.promoActual).length);
  readonly cantidadPromoSiguiente = computed(() => this.vigentes().filter((d) => d.promo === this.promoSiguiente).length);

  //--- 3) Promedio de egresados ---

  readonly promedioEgresados = computed(() =>
  {
    const vendidos = this.vendidosAnio();
    if (!vendidos.length) return 0;
    return vendidos.reduce((total, d) => total + d.nroEgresados, 0) / vendidos.length;
  });

  //--- 4 y 5) Por nivel, con filtro opcional de provincia y localidad ---

  readonly provincias = computed(() => this.valoresUnicos(this.vendidosAnio().map((d) => d.provincia)));

  readonly localidades = computed(() =>
  {
    const provincia = this.provincia();
    const base = provincia ? this.vendidosAnio().filter((d) => d.provincia === provincia) : this.vendidosAnio();
    return this.valoresUnicos(base.map((d) => d.localidad));
  });

  private readonly vendidosFiltrados = computed(() =>
  {
    const provincia = this.provincia();
    const localidad = this.localidad();
    return this.vendidosAnio().filter((d) =>
      (!provincia || d.provincia === provincia) && (!localidad || d.localidad === localidad),
    );
  });

  readonly ventasPorNivel = computed<Barra[]>(() =>
  {
    const vendidos = this.vendidosFiltrados();
    const filas = NIVELES.map((nivel) => ({
      etiqueta: nivel,
      cantidad: vendidos.filter((d) => d.nivel === nivel).length,
    }));

    // Por si hay grupos viejos sin nivel cargado, que no se pierdan del total
    const sinNivel = vendidos.filter((d) => !NIVELES.includes(d.nivel)).length;
    if (sinNivel) filas.push({ etiqueta: 'Sin nivel', cantidad: sinNivel });

    return this.armarBarras(filas);
  });

  readonly totalFiltrado = computed(() => this.vendidosFiltrados().length);
  readonly hayFiltro = computed(() => Boolean(this.provincia() || this.localidad()));

  //--- Cancelados ---

  readonly cancelados = computed(() =>
    (this.datos() ?? [])
      .filter((d) => d.cancelado)
      .sort((a, b) => b.fechaVenta.localeCompare(a.fechaVenta)),
  );

  ngOnInit(): void
  {
    this.traerEstadisticas();
  }

  traerEstadisticas(): void
  {
    this.cargando.set(true);
    this.estadisticasService.obtenerEstadisticasVentas().subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.notificaciones.error({
          title: 'No se pudieron cargar las estadísticas',
          description: 'Intentá nuevamente en unos minutos.',
        });
      },
    });
  }

  cambiarProvincia(provincia: string): void
  {
    this.provincia.set(provincia);
    this.localidad.set(''); // la localidad elegida puede no existir en la nueva provincia
  }

  cambiarLocalidad(localidad: string): void
  {
    this.localidad.set(localidad);
  }

  limpiarFiltros(): void
  {
    this.provincia.set('');
    this.localidad.set('');
  }

  private esDelAnio(fecha: string): boolean
  {
    return Boolean(fecha) && new Date(fecha).getFullYear() === this.anio;
  }

  private valoresUnicos(valores: string[]): string[]
  {
    return [...new Set(valores.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  }

  private armarBarras(filas: { etiqueta: string; cantidad: number }[]): Barra[]
  {
    const maximo = Math.max(1, ...filas.map((f) => f.cantidad));
    return filas.map((f) => ({ ...f, porcentaje: (f.cantidad / maximo) * 100 }));
  }
}
