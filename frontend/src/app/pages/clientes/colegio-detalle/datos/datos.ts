import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { grupoClienteDatosPageResponse } from '../../../../services/grupos/dtos/grupoClienteDatosPage.dto';
import { GruposService } from '../../../../services/grupos/grupos-service';
import { AlumnoResponsable } from '../../../../services/alumnoResponsable/alumno-responsable';
import { alumnoResponsableResponseDTO } from '../../../../services/alumnoResponsable/dto/AlumnoResponsableResponseDTO';
import { PadreResponsableService } from '../../../../services/padreResponsable/padre-responsable-service';
import { PadreResponsableResponseDTO } from '../../../../services/padreResponsable/dto/padreResponsableResponse.dto';
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
  private readonly alumnoResponsableService = inject(AlumnoResponsable);
  private readonly padreResponsableService = inject(PadreResponsableService);
  private readonly notificaciones = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly datosColegio = signal<grupoClienteDatosPageResponse | null>(null);
  readonly cargando = signal(false);
  readonly padresResponsables = signal<PadreResponsableResponseDTO[]>([]);
  readonly alumnosResponsables = signal<alumnoResponsableResponseDTO[]>([]);
  readonly guardandoPadrePrincipalId = signal<number | null>(null);
  readonly guardandoPrincipalId = signal<number | null>(null);

  private readonly idGrupo = Number(this.route.parent?.snapshot.paramMap.get('id'));

  ngOnInit(): void
  {
    this.traerDatosColegio();
    this.traerAlumnosResponsables();
  }

  traerDatosColegio(): void
  {
    const idGrupo = this.idGrupo;

    this.cargando.set(true);

    this.gruposService.obtenerDatosGruposClientes(idGrupo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          this.datosColegio.set(datos);
          this.padresResponsables.set(datos.padresResponsables ?? []);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los datos del colegio.' });
        },
      });
  }

  traerAlumnosResponsables(): void
  {
    this.alumnoResponsableService.traerAlumnosResponsables(this.idGrupo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (alumnos) => this.alumnosResponsables.set(alumnos),
        error: () => {
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los alumnos responsables.' });
        },
      });
  }

  marcarPadrePrincipal(padre: PadreResponsableResponseDTO): void
  {
    if (padre.principal || this.guardandoPadrePrincipalId() !== null) return;

    this.guardandoPadrePrincipalId.set(padre.id);

    this.padreResponsableService.modificarPadrePrincipal(this.idGrupo, padre.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.padresResponsables.update((lista) => lista.map((p) => ({ ...p, principal: p.id === padre.id })));
          this.guardandoPadrePrincipalId.set(null);
        },
        error: () => {
          this.guardandoPadrePrincipalId.set(null);
          this.notificaciones.error({ title: 'Error', description: 'No se pudo cambiar el adulto principal.' });
        },
      });
  }

  marcarAlumnoPrincipal(alumno: alumnoResponsableResponseDTO): void
  {
    if (alumno.principal || this.guardandoPrincipalId() !== null) return;

    this.guardandoPrincipalId.set(alumno.id);

    this.alumnoResponsableService.modificarAlumnoPrincipal(this.idGrupo, alumno.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.alumnosResponsables.update((lista) => lista.map((a) => ({ ...a, principal: a.id === alumno.id })));
          this.guardandoPrincipalId.set(null);
        },
        error: () => {
          this.guardandoPrincipalId.set(null);
          this.notificaciones.error({ title: 'Error', description: 'No se pudo cambiar el alumno principal.' });
        },
      });
  }
}
