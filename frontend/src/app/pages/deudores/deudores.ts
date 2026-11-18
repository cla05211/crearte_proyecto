import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { GruposService } from '../../services/grupos/grupos-service';
import { colegioDeudorDTO } from '../../services/grupos/dtos/colegioDeudor.dto';
import { NotificationService } from '../../shared/notifications/notification.service';
import { PedidosService } from '../../services/pedidos/pedidos-service';

const ESTADO_EN_PRODUCCION = 'En producción';
// Solo visual: administración pausa un colegio en producción; en el resto del sistema sigue igual
const ESTADO_FRENADO = 'Frenado';

@Component({
  selector: 'app-deudores',
  imports: [CurrencyPipe],
  templateUrl: './deudores.html',
  styleUrl: './deudores.css',
})
export class Deudores implements OnInit
{
  private readonly gruposService = inject(GruposService);
  private readonly notificaciones = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly pedidosService = inject(PedidosService);

  readonly deudores = signal<colegioDeudorDTO[] | null>(null);
  readonly cargando = signal(false);
  // idPedido que se está frenando / reanudando
  readonly cambiandoEstado = signal<number | null>(null);

  readonly estadoEnProduccion = ESTADO_EN_PRODUCCION;
  readonly estadoFrenado = ESTADO_FRENADO;

  // Más días de atraso arriba; si empatan, primero el que debe más plata
  readonly deudoresOrdenados = computed(() =>
    [...(this.deudores() ?? [])].sort((a, b) =>
      b.diasAtraso - a.diasAtraso || b.montoAdeudado - a.montoAdeudado,
    ),
  );

  //--- Contadores ---

  readonly totalDeudores = computed(() => this.deudoresOrdenados().length);
  readonly totalAdeudado = computed(() =>
    this.deudoresOrdenados().reduce((acumulador, d) => acumulador + d.montoAdeudado, 0),
  );
  readonly conVariasCuotas = computed(() =>
    this.deudoresOrdenados().filter((d) => d.nroCuotasAdeudadas > 1).length,
  );

  ngOnInit(): void
  {
    this.traerDeudores();
  }

  traerDeudores(): void
  {
    this.cargando.set(true);
    this.gruposService.obtenerGruposDeudores().subscribe({
      next: (deudores) => {
        this.deudores.set(deudores);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.notificaciones.error({
          title: 'No se pudieron cargar los deudores',
          description: 'Intentá nuevamente en unos minutos.',
        });
      },
    });
  }

  abrirFicha(idGrupo: number): void
  {
    this.router.navigate(['/clientes', idGrupo]);
  }

  //--- Frenar / reanudar ---

  // Alterna entre "En producción" y "Frenado". Solo aplica a colegios en producción.
  alternarFrenado(deudor: colegioDeudorDTO): void
  {
    const nuevoEstado = deudor.estadoGeneral === ESTADO_FRENADO ? ESTADO_EN_PRODUCCION : ESTADO_FRENADO;

    this.cambiandoEstado.set(deudor.idPedido);
    this.pedidosService.modificarEstadoGeneral(nuevoEstado, deudor.idPedido).subscribe({
      next: () => {
        this.deudores.update((deudores) =>
          (deudores ?? []).map((d) => (d.idPedido === deudor.idPedido ? { ...d, estadoGeneral: nuevoEstado } : d)),
        );
        this.cambiandoEstado.set(null);
        this.notificaciones.success({
          title: nuevoEstado === ESTADO_FRENADO ? 'Colegio frenado' : 'Colegio reanudado',
          description: `${deudor.colegio} quedó como "${nuevoEstado}".`,
        });
      },
      error: () => {
        this.cambiandoEstado.set(null);
        this.notificaciones.error({
          title: 'No se pudo cambiar el estado',
          description: 'Intentá nuevamente en unos minutos.',
        });
      },
    });
  }
}
