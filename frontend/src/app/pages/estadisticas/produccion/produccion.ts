import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Estadisticas as EstadisticasService } from '../../../services/estadisticas/estadisticas';
import { EstadisticasProduccionDTO } from '../../../services/estadisticas/dto/estadisticasProduccion.dto';
import { NotificationService } from '../../../shared/notifications/notification.service';

type TipoPrenda = keyof EstadisticasProduccionDTO['prendas'];

interface MesProduccion
{
  mes: string;
  vendidos: number;
  enviados: number;
  porcentajeVendidos: number; // alto de la barra de vendidos, relativo al mes con más ventas
  porcentajeEnviados: number; // alto de la barra de enviados, relativo a los vendidos de ese mes
}

interface PrendaPorMes
{
  tipo: TipoPrenda;
  etiqueta: string;
  porMes: number[]; // 12 posiciones, de enero a diciembre
  total: number;
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const PRENDAS: { tipo: TipoPrenda; etiqueta: string }[] = [
  { tipo: 'buzos', etiqueta: 'Buzos' },
  { tipo: 'camperas', etiqueta: 'Camperas' },
  { tipo: 'remeras', etiqueta: 'Remeras' },
  { tipo: 'chombas', etiqueta: 'Chombas' },
  { tipo: 'pantalones', etiqueta: 'Pantalones' },
];

@Component({
  selector: 'app-estadisticas-produccion',
  imports: [DecimalPipe],
  templateUrl: './produccion.html',
  styleUrls: ['../estadisticas-compartido.css', './produccion.css'],
})
export class Produccion implements OnInit
{
  private readonly estadisticasService = inject(EstadisticasService);
  private readonly notificaciones = inject(NotificationService);

  readonly anio = new Date().getFullYear();
  readonly meses = MESES;

  // El back ya trae solo los colegios vendidos este año y sin cancelados
  readonly datos = signal<EstadisticasProduccionDTO[] | null>(null);
  readonly cargando = signal(false);

  private readonly colegios = computed(() => this.datos() ?? []);

  //--- Colegios enviados a producción ---

  readonly totalVendidos = computed(() => this.colegios().length);
  readonly totalEnviados = computed(() => this.colegios().filter((c) => c.enviadoProduccion).length);
  readonly porcentajeEnviados = computed(() =>
    this.totalVendidos() ? (this.totalEnviados() / this.totalVendidos()) * 100 : 0,
  );

  readonly produccionPorMes = computed<MesProduccion[]>(() =>
  {
    const vendidos = new Array(12).fill(0);
    const enviados = new Array(12).fill(0);

    for (const colegio of this.colegios())
    {
      const mes = this.mesDeVenta(colegio);
      vendidos[mes]++;
      if (colegio.enviadoProduccion) enviados[mes]++;
    }

    const maximo = Math.max(1, ...vendidos);
    return MESES.map((mes, i) => ({
      mes,
      vendidos: vendidos[i],
      enviados: enviados[i],
      porcentajeVendidos: (vendidos[i] / maximo) * 100,
      porcentajeEnviados: vendidos[i] ? (enviados[i] / vendidos[i]) * 100 : 0,
    }));
  });

  //--- Prendas producidas (el back ya pone 0 en los pedidos que no están en producción) ---

  readonly prendasPorMes = computed<PrendaPorMes[]>(() =>
  {
    const filas = PRENDAS.map(({ tipo, etiqueta }) =>
    {
      const porMes = new Array(12).fill(0);
      for (const colegio of this.colegios())
      {
        porMes[this.mesDeVenta(colegio)] += colegio.prendas[tipo];
      }
      return { tipo, etiqueta, porMes, total: porMes.reduce((a, b) => a + b, 0) };
    });

    return filas;
  });

  readonly totalPrendas = computed(() => this.prendasPorMes().reduce((total, p) => total + p.total, 0));

  // Fila de totales de la tabla: todas las prendas por mes
  readonly totalPrendasPorMes = computed(() =>
    MESES.map((_, i) => this.prendasPorMes().reduce((total, p) => total + p.porMes[i], 0)),
  );

  //--- Banderas ---

  readonly banderasProduccion = computed(() => this.colegios().reduce((total, c) => total + c.banderasProduccion, 0));
  readonly banderasBeneficio = computed(() => this.colegios().reduce((total, c) => total + c.banderasBeneficio, 0));

  ngOnInit(): void
  {
    this.traerEstadisticas();
  }

  traerEstadisticas(): void
  {
    this.cargando.set(true);
    this.estadisticasService.obtenerEstadisticasProduccion().subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.notificaciones.error({
          title: 'No se pudieron cargar las estadísticas de producción',
          description: 'Intentá nuevamente en unos minutos.',
        });
      },
    });
  }

  private mesDeVenta(colegio: EstadisticasProduccionDTO): number
  {
    return new Date(colegio.fechaVenta).getMonth();
  }
}
