import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PedidosService } from '../../../../../services/pedidos/pedidos-service';
import { PagosService } from '../../../../../services/pagos/pagos-service';
import { PagoResponseDTO } from '../../../../../services/pagos/dto/pagoResponse.dto';
import { PagoDTO } from '../../../../../services/gestionPedidos/dto/pago.dto';
import { GestionPedidosService } from '../../../../../services/gestionPedidos/gestion-pedidos-service';
import { CuotasService } from '../../../../../services/cuotas/cuotas-service';
import { CuotaResponseDTO } from '../../../../../services/cuotas/dto/CuotaResponseDTO';
import { DocumentosService } from '../../../../../services/documentos/documentos-service';
import { StorageService } from '../../../../../services/storage/storage-service';
import { NotificationService } from '../../../../../shared/notifications/notification.service';
import { ConfirmationService } from '../../../../../services/confirmation/confirmation.service';

interface FormularioPago {
  fecha: string;
  monto: number | null;
}

interface FormularioPagoCuota {
  fecha: string;
}

@Component({
  selector: 'app-cuenta-corriente',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './cuenta-corriente.html',
  styleUrl: './cuenta-corriente.css',
})
export class CuentaCorriente implements OnInit
{
  private readonly route = inject(ActivatedRoute);
  private readonly pedidosService = inject(PedidosService);
  private readonly pagosService = inject(PagosService);
  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly cuotasService = inject(CuotasService);
  private readonly documentosService = inject(DocumentosService);
  private readonly storageService = inject(StorageService);
  private readonly notificaciones = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  private idPedido = 0;

  readonly cargando = signal(false);
  readonly pagosCliente = signal<PagoResponseDTO[]>([]);
  readonly importeTotal = signal<number | null>(null);

  readonly totalPagado = computed(() =>
    this.pagosCliente().reduce((total, pago) => total + (pago.monto ?? 0), 0),
  );

  readonly totalFaltante = computed(() => {
    const total = this.importeTotal();
    return total === null ? null : total - this.totalPagado();
  });

  readonly vistaFormulario = signal(false);
  readonly guardando = signal(false);
  readonly descargandoId = signal<number | null>(null);
  readonly descargandoReciboId = signal<number | null>(null);
  readonly eliminandoId = signal<number | null>(null);
  formularioPago: FormularioPago = this.crearFormularioVacio();

  readonly cuotasCliente = signal<CuotaResponseDTO[]>([]);
  readonly cuotaSeleccionada = signal<CuotaResponseDTO | null>(null);
  readonly pagandoCuota = signal(false);
  formularioPagoCuota: FormularioPagoCuota = this.crearFormularioPagoCuotaVacio();

  ngOnInit(): void
  {
    this.inicializar();
  }

  private async inicializar(): Promise<void>
  {
    const idGrupo = Number(this.route.parent?.parent?.snapshot.paramMap.get('id'));

    this.cargando.set(true);

    try
    {
      this.idPedido = await firstValueFrom(this.pedidosService.obtenerIdPedidoGrupo(idGrupo));
      this.cargarPagos();
      this.cargarImporteTotal();
      this.cargarCuotas();
    }
    catch
    {
      this.cargando.set(false);
      this.notificaciones.error({ title: 'Error', description: 'No se pudo encontrar el pedido de este colegio.' });
    }
  }

  private cargarPagos(): void
  {
    this.pagosService.traerPagosIdPedido(this.idPedido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagos) => {
          this.pagosCliente.set(pagos);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los pagos del cliente.' });
        },
      });
  }

  private cargarImporteTotal(): void
  {
    this.gestionPedidosService.obtenerImporteTotalPedido(this.idPedido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (importe) => this.importeTotal.set(importe),
        error: () => this.notificaciones.error({ title: 'Error', description: 'No se pudo obtener el total del pedido.' }),
      });
  }

  private cargarCuotas(): void
  {
    this.cuotasService.traerCuotasIdPedido(this.idPedido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cuotas) => this.cuotasCliente.set(cuotas),
        error: () => this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener las cuotas del cliente.' }),
      });
  }

  private crearFormularioVacio(): FormularioPago
  {
    return { fecha: new Date().toISOString().slice(0, 10), monto: null };
  }

  private crearFormularioPagoCuotaVacio(): FormularioPagoCuota
  {
    return { fecha: new Date().toISOString().slice(0, 10) };
  }

  abrirFormulario(): void
  {
    this.formularioPago = this.crearFormularioVacio();
    this.vistaFormulario.set(true);
  }

  cerrarFormulario(): void
  {
    this.vistaFormulario.set(false);
  }

  mostrarEntidadPago(pago: PagoResponseDTO): boolean
  {
    return pago.banco !== 'Efectivo';
  }

  restanteCuota(cuota: CuotaResponseDTO): number
  {
    return (cuota.importe ?? 0) - (cuota.monto_cubierto ?? 0);
  }

  esCuotaPagable(cuota: CuotaResponseDTO): boolean
  {
    return cuota.estado !== 'Pagada';
  }

  claseBadgeEstado(estado: string): string
  {
    switch (estado)
    {
      case 'Pagada': return 'ds-badge--success';
      case 'Parcial': return 'ds-badge--warning';
      case 'Adeudada': return 'ds-badge--danger';
      default: return '';
    }
  }

  abrirPagoCuota(cuota: CuotaResponseDTO): void
  {
    this.cuotaSeleccionada.set(cuota);
    this.formularioPagoCuota = this.crearFormularioPagoCuotaVacio();
  }

  cerrarPagoCuota(): void
  {
    this.cuotaSeleccionada.set(null);
  }

  confirmarPagoCuota(): void
  {
    const cuota = this.cuotaSeleccionada();
    if (!cuota) return;

    if (!this.formularioPagoCuota.fecha)
    {
      this.notificaciones.error({ title: 'Falta la fecha', description: 'Ingresá la fecha del pago.' });
      return;
    }

    const monto = this.restanteCuota(cuota);

    if (monto <= 0)
    {
      this.notificaciones.error({ title: 'Cuota sin saldo', description: 'Esta cuota ya está pagada.' });
      return;
    }

    const dto: PagoDTO = {
      id_pedido: this.idPedido,
      nro_transferencia: '',
      monto,
      motivo: 'Cuota',
      fecha: new Date(`${this.formularioPagoCuota.fecha}T00:00:00`),
      aprobado: true,
      banco: 'Efectivo',
      entidad_pago: '',
    };

    this.pagandoCuota.set(true);

    this.pagosService.crearPago(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pagandoCuota.set(false);
          this.notificaciones.success({ title: 'Cuota pagada', description: 'El pago se registró correctamente.' });
          this.cerrarPagoCuota();
          this.cargarCuotas();
          this.cargarPagos();
        },
        error: (err: HttpErrorResponse) => {
          this.pagandoCuota.set(false);
          this.notificarErrorGuardado(err);
        },
      });
  }

  guardarPago(): void
  {
    const formulario = this.formularioPago;

    if (!formulario.fecha)
    {
      this.notificaciones.error({ title: 'Falta la fecha', description: 'Ingresá la fecha del pago.' });
      return;
    }

    if (!formulario.monto || formulario.monto <= 0)
    {
      this.notificaciones.error({ title: 'Monto inválido', description: 'Ingresá un monto mayor a 0.' });
      return;
    }

    const dto: PagoDTO = {
      id_pedido: this.idPedido,
      nro_transferencia: '',
      monto: formulario.monto,
      motivo: 'Cuota',
      fecha: new Date(`${formulario.fecha}T00:00:00`),
      aprobado: true,
      banco: 'Efectivo',
      entidad_pago: '',
    };

    this.guardando.set(true);

    this.pagosService.crearPago(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.notificaciones.success({ title: 'Pago agregado', description: 'El pago se registró correctamente.' });
          this.cerrarFormulario();
          this.cargarPagos();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.notificarErrorGuardado(err);
        },
      });
  }

  async descargarComprobante(pago: PagoResponseDTO): Promise<void>
  {
    if (!pago.id_documento) return;

    this.descargandoId.set(pago.id);

    try
    {
      const ruta = (await firstValueFrom(this.documentosService.obtenerUrlArchivo(pago.id_documento))).url;
      await this.storageService.descargarImagen(`Comprobante-${pago.id}`, ruta);
    }
    catch
    {
      this.notificaciones.error({ title: 'Error', description: 'No se pudo descargar el comprobante.' });
    }
    finally
    {
      this.descargandoId.set(null);
    }
  }

  async descargarRecibo(pago: PagoResponseDTO): Promise<void>
  {
    this.descargandoReciboId.set(pago.id);

    try
    {
      const blob = await firstValueFrom(this.pagosService.descargarReciboPago(pago.id));
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `recibo-${pago.id}.pdf`;
      enlace.click();
      window.URL.revokeObjectURL(url);
    }
    catch
    {
      this.notificaciones.error({ title: 'Error', description: 'No se pudo generar el recibo.' });
    }
    finally
    {
      this.descargandoReciboId.set(null);
    }
  }

  async eliminarPago(pago: PagoResponseDTO): Promise<void>
  {
    const confirmado = await this.confirmationService.confirm({
      title: 'Eliminar pago',
      description: '¿Está seguro de que desea eliminar este pago? Las cuotas del cliente se van a actualizar.',
    });

    if (!confirmado) return;

    this.eliminandoId.set(pago.id);

    this.pagosService.eliminarPago(pago.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.eliminandoId.set(null);
          this.notificaciones.success({ title: 'Pago eliminado', description: 'El pago se eliminó correctamente.' });
          this.cargarPagos();
          this.cargarCuotas();
        },
        error: () => {
          this.eliminandoId.set(null);
          this.notificaciones.error({ title: 'Error', description: 'No se pudo eliminar el pago.' });
        },
      });
  }

  private notificarErrorGuardado(err: HttpErrorResponse): void
  {
    if (err.status === 0)
    {
      this.notificaciones.error({ title: 'Sin conexión', description: 'No se pudo conectar con el servidor. Verificá tu conexión a internet.' });
      return;
    }

    if (err.status === 401 || err.status === 403)
    {
      this.notificaciones.error({ title: 'Sesión no válida', description: 'No tenés permisos o tu sesión expiró. Volvé a iniciar sesión.' });
      return;
    }

    if (err.status >= 500)
    {
      this.notificaciones.error({ title: 'Error del servidor', description: 'Ocurrió un error inesperado en el servidor. Intentá nuevamente más tarde.' });
      return;
    }

    this.notificaciones.error({ title: 'Error al guardar', description: err?.error?.message || 'No se pudo guardar el pago.' });
  }
}
