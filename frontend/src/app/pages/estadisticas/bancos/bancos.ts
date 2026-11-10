import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Estadisticas as EstadisticasService } from '../../../services/estadisticas/estadisticas';
import { EstadisticasBancosDTO } from '../../../services/estadisticas/dto/estadisticasBancos.dto';
import { AnioEstadisticas } from '../../../services/estadisticas/anio-estadisticas';
import { NotificationService } from '../../../shared/notifications/notification.service';

interface FacturacionBanco
{
  banco: string;
  monto: number;
  porcentaje: number; // participación sobre el total facturado (0 a 100)
}

@Component({
  selector: 'app-estadisticas-bancos',
  imports: [CurrencyPipe, DecimalPipe],
  templateUrl: './bancos.html',
  styleUrls: ['../estadisticas-compartido.css', './bancos.css'],
})
export class Bancos
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

  readonly datos = signal<EstadisticasBancosDTO | null>(null);
  readonly cargando = signal(false);

  // El back ya devuelve los totales del año por banco (según la fecha de cada pago)
  private readonly totalComafi = computed(() => this.datos()?.facturacionCOMAFI ?? 0);
  private readonly totalSantander = computed(() => this.datos()?.facturacionSantander ?? 0);

  readonly totalFacturado = computed(() => this.totalComafi() + this.totalSantander());

  readonly facturacionPorBanco = computed<FacturacionBanco[]>(() =>
  {
    const total = this.totalFacturado();
    return [
      { banco: 'COMAFI', monto: this.totalComafi() },
      { banco: 'Santander', monto: this.totalSantander() },
    ].map((b) => ({ ...b, porcentaje: total ? (b.monto / total) * 100 : 0 }));
  });


  traerEstadisticas(): void
  {
    this.cargando.set(true);
    this.estadisticasService.obtenerEstadisticasBancos(this.anio()).subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.notificaciones.error({
          title: 'No se pudieron cargar las estadísticas de bancos',
          description: 'Intentá nuevamente en unos minutos.',
        });
      },
    });
  }
}
