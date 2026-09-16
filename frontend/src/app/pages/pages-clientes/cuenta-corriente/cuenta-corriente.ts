import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { PagosService } from '../../../services/pagos/pagos-service';
import { ClientesPortalService } from '../../../services/clientes-portal/clientes-portal-service';
import { StorageService } from '../../../services/storage/storage-service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { ConfirmationService } from '../../../services/confirmation/confirmation.service';
import { PagoResponseDTO } from '../../../services/pagos/dto/pagoResponse.dto';
import { CuotaResponseDTO } from '../../../services/cuotas/dto/CuotaResponseDTO';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  private readonly clientesPortalService = inject(ClientesPortalService);
  private readonly pagosService = inject(PagosService);
  private readonly storageService = inject(StorageService);
  private readonly notificaciones = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  private idPedido = 0;

  readonly cargando = signal(false);
  readonly pagosCliente = signal<PagoResponseDTO[]>([]);
  readonly importeTotal = signal<number | null>(null);
  readonly seniaTotal = signal<number | null>(null);

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

  readonly seniaPagada = computed(() =>
    this.pagosCliente()
      .filter((pago) => pago.motivo === 'Seña')
      .reduce((total, pago) => total + (pago.monto ?? 0), 0),
  );

  readonly seniaFaltante = computed(() => Math.max((this.seniaTotal() ?? 0) - this.seniaPagada(), 0));

  readonly pagoSeniaAbierto = signal(false);
  readonly pagandoSenia = signal(false);
  formularioPagoSenia: FormularioPagoCuota = this.crearFormularioPagoCuotaVacio();

  ngOnInit(): void
  {
    this.inicializar();
  }

  private async inicializar(): Promise<void>
  {
    this.cargando.set(true);

    try
    {
      this.idPedido = await firstValueFrom(this.clientesPortalService.obtenerIdPedido());
      this.cargarPagos();
      this.cargarImporteTotal();
      this.cargarSeniaTotal();
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
    this.clientesPortalService.obtenerPagos()
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

  private cargarSeniaTotal(): void
  {
    this.clientesPortalService.obtenerSeniaTotal()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (senia) => {
          this.seniaTotal.set(senia);
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
    this.clientesPortalService.obtenerImporteTotal()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (importe) => this.importeTotal.set(importe),
        error: () => this.notificaciones.error({ title: 'Error', description: 'No se pudo obtener el total del pedido.' }),
      });
  }

  private cargarCuotas(): void
  {
    this.clientesPortalService.obtenerCuotas()
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

  estadoSenia(): string
  {
    if (this.seniaFaltante() <= 0) return 'Pagada';
    if (this.seniaPagada() > 0) return 'Parcial';
    return 'Pendiente';
  }

  abrirPagoSenia(): void
  {
    this.formularioPagoSenia = this.crearFormularioPagoCuotaVacio();
    this.pagoSeniaAbierto.set(true);
  }

  cerrarPagoSenia(): void
  {
    this.pagoSeniaAbierto.set(false);
  }

  confirmarPagoSenia(): void
  {
    if (!this.formularioPagoSenia.fecha)
    {
      this.notificaciones.error({ title: 'Falta la fecha', description: 'Ingresá la fecha del pago.' });
      return;
    }

    const monto = this.seniaFaltante();

    if (monto <= 0)
    {
      this.notificaciones.error({ title: 'Seña sin saldo', description: 'La seña ya está totalmente pagada.' });
      return;
    }

    this.pagandoSenia.set(true);

    this.clientesPortalService.crearPago({
      monto,
      motivo: 'Seña',
      fecha: `${this.formularioPagoSenia.fecha}T00:00:00`,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pagandoSenia.set(false);
          this.notificaciones.success({ title: 'Pago registrado', description: 'Tu pago quedó cargado y pendiente de confirmación del colegio.' });
          this.cerrarPagoSenia();
          this.cargarPagos();
        },
        error: (err: HttpErrorResponse) => {
          this.pagandoSenia.set(false);
          this.notificarErrorGuardado(err);
        },
      });
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

    this.pagandoCuota.set(true);

    this.clientesPortalService.crearPago({
      monto,
      motivo: 'Cuota',
      fecha: `${this.formularioPagoCuota.fecha}T00:00:00`,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pagandoCuota.set(false);
          this.notificaciones.success({ title: 'Pago registrado', description: 'Tu pago quedó cargado y pendiente de confirmación del colegio.' });
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

    this.guardando.set(true);

    this.clientesPortalService.crearPago({
      monto: formulario.monto,
      motivo: 'Cuota',
      fecha: `${formulario.fecha}T00:00:00`,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.notificaciones.success({ title: 'Pago registrado', description: 'Tu pago quedó cargado y pendiente de confirmación del colegio.' });
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
      const ruta = (await firstValueFrom(this.clientesPortalService.obtenerUrlDocumento(pago.id_documento))).url;
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
