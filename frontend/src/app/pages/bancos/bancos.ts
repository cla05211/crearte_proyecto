import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PagoBancoResponse } from '../../services/pagos/dto/pagoBancoResponse.dto';
import { PagosService } from '../../services/pagos/pagos-service';
import { ModificarPago } from '../../services/pagos/dto/modificarBanco.dto';
import { GenerarExcelDTO } from '../../../interfaces/generarExcel.dto';
import { GenerarReciboDTO } from '../../../interfaces/generarRecibo.dto';
import { NotificationService } from '../../shared/notifications/notification.service';
import { PadreResponsableService } from '../../services/padreResponsable/padre-responsable-service';
import { PadreResponsableDTO } from '../../services/gestionPedidos/dto/padreResponsable.dto';
import { CuotasService } from '../../services/cuotas/cuotas-service';

type Banco = 'COMAFI' | 'Santander';

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

  pagosComafi = signal<PagoBancoResponse[]>([]);
  pagosSantander = signal<PagoBancoResponse[]>([]);
  cargando = signal(false);

  bancoSeleccionado = signal<Banco>('COMAFI');
  pagosVisibles = computed(() =>
    this.bancoSeleccionado() === 'COMAFI' ? this.pagosComafi() : this.pagosSantander()
  );

  modoSeleccion = signal(false);
  seleccionados = signal<Set<number>>(new Set());
  generandoExcel = signal(false);
  descargandoReciboId = signal<number | null>(null);

  pagosSeleccionables = computed(() =>
    this.pagosVisibles().filter(pago => !pago.enviado_banco)
  );

  todosSeleccionados = computed(() => {
    const seleccionables = this.pagosSeleccionables();
    return seleccionables.length > 0 && seleccionables.every(pago => this.seleccionados().has(pago.id));
  });

  ngOnInit(): void
  {
    this.obtenerPagosComafi();
    this.obtenerPagosSantander();
  }

  obtenerPagosComafi()
  {
    this.cargando.set(true);
    this.pagosService.traerPagosBanco("COMAFI")
    .subscribe({
      next: (pagos) => {
        this.pagosComafi.set(pagos);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.notificaciones.error({ title: 'Error al cargar pagos', description: 'No se pudieron obtener los pagos de COMAFI.' });
      },
    });
  }

  obtenerPagosSantander()
  {
    this.pagosService.traerPagosBanco("Santander")
    .subscribe({
      next: (pagos) => {
        this.pagosSantander.set(pagos);
      },
      error: () => {
        this.notificaciones.error({ title: 'Error al cargar pagos', description: 'No se pudieron obtener los pagos de Santander.' });
      },
    });
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

  async generarComprobantePDF(pago: PagoBancoResponse)
  {
    this.descargandoReciboId.set(pago.id);

    const padreResponsable: PadreResponsableDTO = await firstValueFrom(this.padreResponsableService.traerPadreResponsableId(pago.id_grupo));
    const nroCuotas: number = (await firstValueFrom(this.cuotasService.traerCuotasIdPedido(pago.id_pedido))).length;


    const dto: GenerarReciboDTO = {
      numero: pago.nro_transferencia,
      fecha: this.formatearFecha(pago.fecha),
      clienteNombre: pago.nombre_colegio,
      localidad:pago.localidad,
      concepto: pago.motivo,
      importe: pago.monto,
      leyendaSenia: false,
      turno: pago.turno,
      orientacion: pago.orientacion,
      nivel: pago.nivel,
      nombrePadre: padreResponsable.nombre,
      apellidoPadre: padreResponsable.apellido,
      nroCuotas: nroCuotas,
    };

    this.pagosService.descargarRecibo(dto)
    .subscribe({
      next: (blob) => {
        this.descargarArchivo(blob, `recibo-${pago.nro_transferencia}.pdf`);
        this.descargandoReciboId.set(null);
      },
      error: () => {
        this.notificaciones.error({ title: 'Error', description: 'No se pudo descargar el comprobante.' });
        this.descargandoReciboId.set(null);
      },
    });
  }

  private marcarComoEnviados(ids: number[]): void
  {
    const idsSet = new Set(ids);
    const actualizar = (lista: PagoBancoResponse[]) =>
      lista.map(pago => idsSet.has(pago.id) ? { ...pago, enviado_banco: true } : pago);

    this.pagosComafi.update(actualizar);
    this.pagosSantander.update(actualizar);
  }

  private actualizarPagoLocal(id: number, cambios: Partial<PagoBancoResponse>): void
  {
    const actualizar = (lista: PagoBancoResponse[]) =>
      lista.map(pago => pago.id === id ? { ...pago, ...cambios } : pago);

    this.pagosComafi.update(actualizar);
    this.pagosSantander.update(actualizar);
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
