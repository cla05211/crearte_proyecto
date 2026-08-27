import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { grupoClienteDatosPageResponse } from '../../../../services/grupos/dtos/grupoClienteDatosPage.dto';
import { GruposService } from '../../../../services/grupos/grupos-service';
import { NotificationService } from '../../../../shared/notifications/notification.service';

@Component({
  selector: 'app-datos',
  imports: [],
  templateUrl: './datos.html',
  styleUrl: './datos.css',
})
export class Datos implements OnInit
{
  private readonly gruposService = inject(GruposService);
  private readonly notificaciones = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly datosColegio = signal<grupoClienteDatosPageResponse | null>(null);
  readonly cargando = signal(false);

  ngOnInit(): void
  {
    this.traerDatosColegio();
  }

  traerDatosColegio(): void
  {
    const idGrupo = Number(this.route.parent?.snapshot.paramMap.get('id'));

    this.cargando.set(true);

    this.gruposService.obtenerDatosGruposClientes(idGrupo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          this.datosColegio.set(datos);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los datos del colegio.' });
        },
      });
  }
}
