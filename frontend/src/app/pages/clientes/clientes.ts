import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { GruposService } from '../../services/grupos/grupos-service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { grupoClientePageResponseDTO } from '../../services/grupos/dtos/grupoClientePage.dto copy';

interface PaginaClientes
{
  clientes: grupoClientePageResponseDTO[];
  pagina: number;
  hayMasPaginas: boolean;
}

@Component({
  selector: 'app-clientes',
  imports: [FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css',
})
export class Clientes implements OnInit
{
  private readonly gruposClientesSerivce = inject(GruposService);
  private readonly notificaciones = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly TAMANIO_PAGINA = 10;

  private readonly paginaVacia: PaginaClientes = { clientes: [], pagina: 0, hayMasPaginas: false };
  readonly datosPagina = signal<PaginaClientes>({ ...this.paginaVacia });
  readonly cargando = signal(false);
  readonly clientesVisibles = computed(() => this.datosPagina().clientes);

  private readonly solicitudPagina$ = new Subject<number>();
  private readonly busquedaCambiada$ = new Subject<string>();

  readonly busqueda = signal('');
  readonly busquedaInput = signal('');

  ngOnInit(): void
  {
    this.inicializarPipelineClientes();
    this.inicializarBusquedaConDebounce();
    this.cargarGruposClientes();
  }

  private inicializarPipelineClientes(): void
  {
    this.solicitudPagina$
      .pipe(
        switchMap((pagina) => {
          this.cargando.set(true);
          const desde = pagina * this.TAMANIO_PAGINA;
          const hasta = desde + this.TAMANIO_PAGINA - 1;
          const busqueda = this.busqueda().trim() || undefined;

          return this.gruposClientesSerivce.obtenerGruposClientes(desde, hasta, busqueda).pipe(
            map((clientes) => ({ pagina, clientes })),
            catchError(() => {
              this.cargando.set(false);
              this.notificaciones.error({ title: 'Error al cargar clientes', description: 'No se pudo obtener el listado de colegios.' });
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        if (!resultado) return;
        const { pagina, clientes } = resultado;

        if (clientes.length === 0 && pagina > 0)
        {
          this.datosPagina.update((actual) => ({ ...actual, hayMasPaginas: false }));
        }
        else
        {
          this.datosPagina.set({ clientes, pagina, hayMasPaginas: clientes.length === this.TAMANIO_PAGINA });
        }

        this.cargando.set(false);
      });
  }

  private inicializarBusquedaConDebounce(): void
  {
    this.busquedaCambiada$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => {
        this.busqueda.set(valor.trim());
        this.cargarGruposClientes();
      });
  }

  actualizarBusqueda(valor: string): void
  {
    this.busquedaInput.set(valor);
    this.busquedaCambiada$.next(valor);
  }

  cargarGruposClientes(): void
  {
    this.solicitudPagina$.next(0);
  }

  paginaAnterior(): void
  {
    const actual = this.datosPagina();
    if (actual.pagina === 0) return;
    this.solicitudPagina$.next(actual.pagina - 1);
  }

  paginaSiguiente(): void
  {
    const actual = this.datosPagina();
    if (!actual.hayMasPaginas) return;
    this.solicitudPagina$.next(actual.pagina + 1);
  }

  abrirColegio(cliente: grupoClientePageResponseDTO): void
  {
    this.router.navigate(['/clientes', cliente.idGrupo]);
  }
}
