import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { firstValueFrom, forkJoin, of, Subject } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PagoBancoResponse } from '../../services/pagos/dto/pagoBancoResponse.dto';
import { PagosService } from '../../services/pagos/pagos-service';
import { ModificarPago } from '../../services/pagos/dto/modificarBanco.dto';
import { GenerarExcelDTO } from '../../../interfaces/generarExcel.dto';
import { GenerarReciboDTO } from '../../../interfaces/generarRecibo.dto';
import { NotificationService } from '../../shared/notifications/notification.service';
import { PadreResponsableService } from '../../services/padreResponsable/padre-responsable-service';
import { PadreResponsableDTO } from '../../services/gestionPedidos/dto/padreResponsable.dto';
import { CuotasService } from '../../services/cuotas/cuotas-service';
import { StorageService } from '../../services/storage/storage-service';
import { DocumentosService } from '../../services/documentos/documentos-service';

type Banco = 'COMAFI' | 'Santander';

interface PaginaPagos {
  pagos: PagoBancoResponse[];
  pagina: number;
  hayMasPaginas: boolean;
}

@Component({
  selector: 'app-bancos',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './bancos.html',
  styleUrl: './bancos.css',
})
export class Bancos implements OnInit
{
  private readonly pagosService = inject(PagosService);
  private readonly notificaciones = inject(NotificationService);
  private readonly padreResponsableService = inject(PadreResponsableService);
  private readonly cuotasService = inject(CuotasService);
  private readonly storageService = inject(StorageService);
  private readonly documentosService = inject(DocumentosService);
  private readonly destroyRef = inject(DestroyRef);

  readonly TAMANIO_PAGINA = 10;
  private readonly paginaVacia: PaginaPagos = { pagos: [], pagina: 0, hayMasPaginas: false };
  paginasPorBanco = signal<Record<Banco, PaginaPagos>>({
    COMAFI: { ...this.paginaVacia },
    Santander: { ...this.paginaVacia },
  });
  cargandoPorBanco = signal<Record<Banco, boolean>>({ COMAFI: false, Santander: false });
  private readonly solicitudPaginaPorBanco = new Map<Banco, Subject<number>>();

  bancoSeleccionado = signal<Banco>('COMAFI');
  datosBancoActual = computed(() => this.paginasPorBanco()[this.bancoSeleccionado()]);
  cargando = computed(() => this.cargandoPorBanco()[this.bancoSeleccionado()]);
  pagosVisibles = computed(() => this.datosBancoActual().pagos);

  mostrarAnteriores = signal(false);

  modoSeleccion = signal(false);
  seleccionados = signal<Set<number>>(new Set());
  generandoExcel = signal(false);
  descargandoReciboId = signal<number | null>(null);

  pagosSeleccionables = computed(() =>
    this.pagosVisibles().filter(pago => !pago.enviado_banco && pago.aprobado)
  );

  filasTabla = computed(() => {
    const lunesActual = this.obtenerLunesSemana(new Date());
    const domingoActual = new Date(lunesActual);
    domingoActual.setDate(domingoActual.getDate() + 6);
    domingoActual.setHours(23, 59, 59, 999);

    let grupoPrevio: string | null = null;

    return this.pagosVisibles().map(pago => {
      const fecha = new Date(pago.fecha);
      const grupo = fecha >= lunesActual && fecha <= domingoActual ? 'Esta semana' : 'Anterior';
      const mostrarEncabezado = grupo !== grupoPrevio;
      grupoPrevio = grupo;
      return { pago, grupo, mostrarEncabezado };
    });
  });

  todosSeleccionados = computed(() => {
    const seleccionables = this.pagosSeleccionables();
    return seleccionables.length > 0 && seleccionables.every(pago => this.seleccionados().has(pago.id));
  });

  ngOnInit(): void
  {
    this.inicializarPipelineBanco('COMAFI');
    this.inicializarPipelineBanco('Santander');
    this.solicitarPagina('COMAFI', 0);
    this.solicitarPagina('Santander', 0);
  }

  private inicializarPipelineBanco(banco: Banco): void
  {
    const solicitudes$ = new Subject<number>();
    this.solicitudPaginaPorBanco.set(banco, solicitudes$);

    solicitudes$
      .pipe(
        switchMap((pagina) => {
          this.cargandoPorBanco.update((actual) => ({ ...actual, [banco]: true }));
          const desde = pagina * this.TAMANIO_PAGINA;
          const hasta = desde + this.TAMANIO_PAGINA - 1;

          return this.pagosService.traerPagosBanco(banco, desde, hasta).pipe(
            map((pagos) => ({ pagina, pagos })),
            catchError(() => {
              this.cargandoPorBanco.update((actual) => ({ ...actual, [banco]: false }));
              this.notificaciones.error({ title: 'Error al cargar pagos', description: `No se pudieron obtener los pagos de ${banco}.` });
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        if (!resultado) return;
        const { pagina, pagos } = resultado;
        this.paginasPorBanco.update((actual) => {
          if (pagos.length === 0 && pagina > 0)
          {
            const anterior = actual[banco];
            return anterior ? { ...actual, [banco]: { ...anterior, hayMasPaginas: false } } : actual;
          }
          return {
            ...actual,
            [banco]: { pagos, pagina, hayMasPaginas: pagos.length === this.TAMANIO_PAGINA },
          };
        });
        this.cargandoPorBanco.update((actual) => ({ ...actual, [banco]: false }));
      });
  }

  private solicitarPagina(banco: Banco, pagina: number): void
  {
    this.solicitudPaginaPorBanco.get(banco)?.next(pagina);
  }

  paginaAnterior(): void
  {
    const banco = this.bancoSeleccionado();
    const actual = this.paginasPorBanco()[banco];
    if (actual.pagina === 0) return;
    this.solicitarPagina(banco, actual.pagina - 1);
  }

  paginaSiguiente(): void
  {
    const banco = this.bancoSeleccionado();
    const actual = this.paginasPorBanco()[banco];
    if (!actual.hayMasPaginas) return;
    this.solicitarPagina(banco, actual.pagina + 1);
  }

  toggleAnteriores(): void
  {
    this.mostrarAnteriores.update(valor => !valor);
  }

  seleccionarBanco(banco: Banco): void
  {
    if (this.bancoSeleccionado() === banco) return;
    this.bancoSeleccionado.set(banco);
    this.cancelarSeleccionExcel();
  }

  iniciarSeleccionExcel(): void
  {
    this.modoSeleccion.set(true);
    this.seleccionados.set(new Set());
  }

  cancelarSeleccionExcel(): void
  {
    this.modoSeleccion.set(false);
    this.seleccionados.set(new Set());
  }

  toggleSeleccionPago(id: number): void
  {
    this.seleccionados.update(actual => {
      const nuevo = new Set(actual);
      if (nuevo.has(id))
      {
        nuevo.delete(id);
      }
      else
      {
        nuevo.add(id);
      }
      return nuevo;
    });
  }

  toggleSeleccionarTodos(): void
  {
    const idsSeleccionables = this.pagosSeleccionables().map(pago => pago.id);

    if (this.todosSeleccionados())
    {
      this.seleccionados.update(actual => {
        const nuevo = new Set(actual);
        idsSeleccionables.forEach(id => nuevo.delete(id));
        return nuevo;
      });
      return;
    }

    this.seleccionados.update(actual => new Set([...actual, ...idsSeleccionables]));
  }

  confirmarGenerarExcel(): void
  {
    const idsSeleccionados = Array.from(this.seleccionados());
    if (idsSeleccionados.length === 0) return;

    const pagosSeleccionados = this.pagosVisibles().filter(pago => idsSeleccionados.includes(pago.id));
    this.generandoExcel.set(true);

    const marcarEnviados = idsSeleccionados.map(id => {
      const dto: ModificarPago = { idPago: String(id), nuevoValor: true };
      return this.pagosService.modificarEnviadoBanco(dto).pipe(catchError(() => of(null)));
    });

    forkJoin(marcarEnviados).subscribe(() => {
      const dto: GenerarExcelDTO = {
        nombreHoja: `Pagos ${this.bancoSeleccionado()}`,
        columnas: [
          { header: 'Fecha', key: 'fecha' },
          { header: 'Nro de Comprobante', key: 'nroComprobante' },
          { header: 'Entidad de Pago', key: 'entidadPago' },
          { header: 'Colegio', key: 'colegio' },
        ],
        filas: pagosSeleccionados.map(pago => ({
          fecha: this.formatearFecha(pago.fecha),
          nroComprobante: pago.nro_transferencia,
          entidadPago: pago.entidad_pago,
          colegio: pago.nombre_colegio,
        })),
      };

      this.pagosService.descargarExcel(dto).subscribe({
        next: (blob) => {
          this.descargarArchivo(blob, `${dto.nombreHoja}.xlsx`);
          this.marcarComoEnviados(idsSeleccionados);
          this.notificaciones.success({ title: 'Excel generado', description: 'El excel se generó y descargó correctamente.' });
          this.cancelarSeleccionExcel();
          this.generandoExcel.set(false);
        },
        error: () => {
          this.notificaciones.error({ title: 'Error al generar excel', description: 'No se pudo generar el archivo de excel.' });
          this.generandoExcel.set(false);
        },
      });
    });
  }

  modificarEnviadoBanco(pago: PagoBancoResponse, nuevoValor: boolean): void
  {
    const dto: ModificarPago = { idPago: String(pago.id), nuevoValor };
    this.pagosService.modificarEnviadoBanco(dto)
    .subscribe({
      next: () => {
        this.actualizarPagoLocal(pago.id, { enviado_banco: nuevoValor });
      },
      error: () => {
        this.notificaciones.error({ title: 'Error', description: 'No se pudo actualizar el estado de envío al banco.' });
      },
    });
  }

  modificarAprobado(pago: PagoBancoResponse): void
  {
    const nuevoValor = !pago.aprobado;
    const dto: ModificarPago = { idPago: String(pago.id), nuevoValor };
    this.pagosService.modificarAprobado(dto)
    .subscribe({
      next: () => {
        this.actualizarPagoLocal(pago.id, { aprobado: nuevoValor });
      },
      error: () => {
        this.notificaciones.error({ title: 'Error', description: 'No se pudo actualizar la aprobación del pago.' });
      },
    });
  }

  async descargarComprobante(pago: PagoBancoResponse)
  {
    this.descargandoReciboId.set(pago.id);

    const idDocumento: number = await firstValueFrom(this.pagosService.traerIdDocumento(pago.id));
    const url: string = (await firstValueFrom(this.documentosService.obtenerUrlArchivo(idDocumento))).url;
    const clienteNombre= pago.nombre_colegio;

    this.storageService.descargarImagen(`Comprobante-${clienteNombre}`, url);
  }

  private marcarComoEnviados(ids: number[]): void
  {
    const idsSet = new Set(ids);
    this.actualizarPagosLocal(pago => idsSet.has(pago.id) ? { ...pago, enviado_banco: true } : pago);
  }

  private actualizarPagoLocal(id: number, cambios: Partial<PagoBancoResponse>): void
  {
    this.actualizarPagosLocal(pago => pago.id === id ? { ...pago, ...cambios } : pago);
  }

  private actualizarPagosLocal(actualizar: (pago: PagoBancoResponse) => PagoBancoResponse): void
  {
    this.paginasPorBanco.update((actual) => {
      const nuevo = { ...actual };
      (Object.keys(nuevo) as Banco[]).forEach((banco) => {
        nuevo[banco] = { ...nuevo[banco], pagos: nuevo[banco].pagos.map(actualizar) };
      });
      return nuevo;
    });
  }

  private obtenerLunesSemana(fecha: Date): Date
  {
    const lunes = new Date(fecha);
    const dia = lunes.getDay();
    const diferencia = dia === 0 ? -6 : 1 - dia;
    lunes.setDate(lunes.getDate() + diferencia);
    lunes.setHours(0, 0, 0, 0);
    return lunes;
  }

  private formatearFecha(fecha: Date | string): string
  {
    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) return String(fecha);
    return fechaObj.toLocaleDateString('es-AR');
  }

  private descargarArchivo(blob: Blob, nombreArchivo: string): void
  {
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();
    window.URL.revokeObjectURL(url);
  }
}
