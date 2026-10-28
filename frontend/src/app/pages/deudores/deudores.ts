import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { GruposService } from '../../services/grupos/grupos-service';
import { colegioDeudorDTO } from '../../services/grupos/dtos/colegioDeudor.dto';
import { NotificationService } from '../../shared/notifications/notification.service';

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

  readonly deudores = signal<colegioDeudorDTO[] | null>(null);
  readonly cargando = signal(false);

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
}
