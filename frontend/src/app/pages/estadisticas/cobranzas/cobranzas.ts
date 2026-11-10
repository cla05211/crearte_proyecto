import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Estadisticas as EstadisticasService } from '../../../services/estadisticas/estadisticas';
import { EstadisticasCobranzasDTO } from '../../../services/estadisticas/dto/estadisticasCobranzas.dto';
import { AnioEstadisticas } from '../../../services/estadisticas/anio-estadisticas';
import { NotificationService } from '../../../shared/notifications/notification.service';

interface MesDeuda
{
  mes: string;
  monto: number;
  porcentaje: number; // alto de la barra, relativo al mes con más deuda
  vencido: boolean;   // el mes ya pasó: lo que queda está atrasado
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  selector: 'app-estadisticas-cobranzas',
  imports: [CurrencyPipe],
  templateUrl: './cobranzas.html',
  styleUrls: ['../estadisticas-compartido.css', './cobranzas.css'],
})
export class Cobranzas
{
  private readonly estadisticasService = inject(EstadisticasService);
  private readonly notificaciones = inject(NotificationService);

  private readonly anioEstadisticas = inject(AnioEstadisticas);
  readonly anio = this.anioEstadisticas.anio;

  // Cada vez que cambia el año del selector se vuelven a pedir los datos
  private readonly recargarAlCambiarAnio = effect(() => {
    this.anio();
    untracked(() => this.traerEstadisticas());
  });
  private readonly mesActual = new Date().getMonth();
  readonly meses = MESES;

  readonly datos = signal<EstadisticasCobranzasDTO[] | null>(null);
  readonly cargando = signal(false);

  private readonly colegios = computed(() => this.datos() ?? []);

  //--- Facturación (el back ya pone 0 en los vendidos otros años) ---

  readonly facturacionTotal = computed(() =>
    this.colegios().reduce((total, c) => total + c.facturacion, 0),
  );

  //--- Deuda a cobrar ---

  readonly deudaPorMes = computed<MesDeuda[]>(() =>
  {
    const montos = new Array(12).fill(0);
    for (const colegio of this.colegios())
    {
      colegio.deudaPorMes.forEach((monto, i) => (montos[i] += monto));
    }

    const maximo = Math.max(1, ...montos);
    return MESES.map((mes, i) => ({
      mes,
      monto: montos[i],
      porcentaje: (montos[i] / maximo) * 100,
      vencido: i < this.mesActual,
    }));
  });

  readonly deudaAnio = computed(() => this.deudaPorMes().reduce((total, m) => total + m.monto, 0));

  // De los meses de este año que ya pasaron
  readonly deudaVencidaAnio = computed(() =>
    this.deudaPorMes().filter((m) => m.vencido).reduce((total, m) => total + m.monto, 0),
  );

  readonly deudaAnterior = computed(() => this.colegios().reduce((total, c) => total + c.deudaAnterior, 0));


  traerEstadisticas(): void
  {
    this.cargando.set(true);
    this.estadisticasService.obtenerEstadisticasCobranzas(this.anio()).subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.notificaciones.error({
          title: 'No se pudieron cargar las estadísticas de cuentas corrientes',
          description: 'Intentá nuevamente en unos minutos.',
        });
      },
    });
  }

  // Monto abreviado para que entre arriba de cada barra: $1,2M / $350k
  montoCorto(monto: number): string
  {
    if (monto >= 1_000_000) return `$${(monto / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`;
    if (monto >= 1_000) return `$${Math.round(monto / 1_000)}k`;
    return monto ? `$${Math.round(monto)}` : '';
  }
}
