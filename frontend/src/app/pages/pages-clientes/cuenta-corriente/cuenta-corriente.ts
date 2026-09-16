import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { PagosService } from '../../../services/pagos/pagos-service';
import { ClientesPortalService } from '../../../services/clientes-portal/clientes-portal-service';
import { StorageService } from '../../../services/storage/storage-service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { ConfirmationService } from '../../../services/confirmation/confirmation.service';
import { PagoResponseDTO } from '../../../services/pagos/dto/pagoResponse.dto';
import { CuotaResponseDTO } from '../../../services/cuotas/dto/CuotaResponseDTO';
import { PagoComprobanteDatosDTO } from '../../../services/pagos/dto/pagoComprobanteDatos.dto';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface FormularioPago {
  fecha: string;
}

// Igual que ComprobanteVerificado en ventas.ts, pero para un solo archivo a
// la vez (el cliente sube un comprobante por pago, no una tanda como en la
// venta). El OCR se dispara apenas se elige el archivo; si falla, se habilita
// la carga manual de los mismos tres datos que intenta leer el OCR.
interface ComprobantePago {
  archivo: File | null;
  verificando: boolean;
  error: string;
  entidadPago: string;
  entidadPagoPersonalizada: boolean;
  requiereIngresoManual: boolean;
  manualNroTransferencia: string;
  manualMonto: number | null;
  manualBanco: string;
  datos: PagoComprobanteDatosDTO | null;
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

  // Mismas listas que usa ventas.ts para el paso de seña: el banco es la
  // cuenta de Crearte que recibió la transferencia (lo detecta el OCR a
  // partir del titular que figura en el comprobante), la entidad de pago es
  // desde dónde mandó la plata el cliente.
  readonly entidadesPago = ["Mercado Pago", "NaranjaX", "Cuenta DNI", "Galicia", "BNA", "Uala", "Santander", "Macro", "Otra"];
  readonly bancosComprobante = ["COMAFI", "Santander"];

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
  readonly comprobantePago = signal<ComprobantePago>(this.crearComprobanteVacio());

  readonly cuotasCliente = signal<CuotaResponseDTO[]>([]);

  readonly seniaPagada = computed(() =>
    this.pagosCliente()
      .filter((pago) => pago.motivo === 'Seña')
      .reduce((total, pago) => total + (pago.monto ?? 0), 0),
  );

  readonly seniaFaltante = computed(() => Math.max((this.seniaTotal() ?? 0) - this.seniaPagada(), 0));

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
    return { fecha: new Date().toISOString().slice(0, 10) };
  }

  private crearComprobanteVacio(): ComprobantePago
  {
    return {
      archivo: null,
      verificando: false,
      error: '',
      entidadPago: '',
      entidadPagoPersonalizada: false,
      requiereIngresoManual: false,
      manualNroTransferencia: '',
      manualMonto: null,
      manualBanco: '',
      datos: null,
    };
  }

  abrirFormulario(): void
  {
    this.formularioPago = this.crearFormularioVacio();
    this.comprobantePago.set(this.crearComprobanteVacio());
    this.vistaFormulario.set(true);
  }

  cerrarFormulario(): void
  {
    this.vistaFormulario.set(false);
  }

  // Igual que seleccionarArchivosSenia() en ventas.ts, pero para un solo
  // archivo: apenas se elige, se dispara la verificación por OCR.
  seleccionarArchivoComprobante(event: Event): void
  {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo) return;

    this.comprobantePago.update((c) => ({
      ...c,
      archivo,
      verificando: true,
      error: '',
      requiereIngresoManual: false,
      manualNroTransferencia: '',
      manualMonto: null,
      manualBanco: '',
      datos: null,
    }));

    this.verificarComprobante(archivo);
  }

  quitarArchivoComprobante(): void
  {
    this.comprobantePago.set(this.crearComprobanteVacio());
  }

  private verificarComprobante(archivo: File): void
  {
    const formData = new FormData();
    formData.append('comprobante', archivo, archivo.name);

    this.pagosService.comprobarDatosComprobante(formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          this.comprobantePago.update((c) => ({ ...c, datos, verificando: false, error: '' }));
        },
        error: () => {
          this.comprobantePago.update((c) => ({
            ...c,
            datos: null,
            verificando: false,
            error: 'No se pudieron extraer los datos del comprobante. Verificá el archivo e intentá nuevamente, o ingresá los datos manualmente.',
            requiereIngresoManual: true,
          }));
        },
      });
  }

  actualizarEntidadComprobante(entidadPago: string): void
  {
    this.comprobantePago.update((c) => {
      if (entidadPago === 'Otra') return { ...c, entidadPagoPersonalizada: true, entidadPago: '' };
      return { ...c, entidadPagoPersonalizada: false, entidadPago };
    });
  }

  actualizarEntidadPagoPersonalizada(entidadPago: string): void
  {
    this.comprobantePago.update((c) => ({ ...c, entidadPago }));
  }

  actualizarDatoManualComprobante(campo: 'nro_transferencia' | 'monto' | 'banco', valor: string): void
  {
    this.comprobantePago.update((c) => {
      const actualizado = { ...c };
      if (campo === 'nro_transferencia') actualizado.manualNroTransferencia = valor.trim();
      if (campo === 'banco') actualizado.manualBanco = valor;
      if (campo === 'monto') actualizado.manualMonto = valor === '' ? null : Number(valor);

      const completo = Boolean(
        actualizado.manualNroTransferencia &&
        actualizado.manualBanco &&
        actualizado.manualMonto &&
        actualizado.manualMonto > 0,
      );

      actualizado.datos = completo
        ? { nro_transferencia: actualizado.manualNroTransferencia, monto: actualizado.manualMonto!, banco: actualizado.manualBanco }
        : null;
      actualizado.error = completo ? '' : c.error;

      return actualizado;
    });
  }

  mostrarEntidadPago(pago: PagoResponseDTO): boolean
  {
    return pago.banco !== 'Efectivo';
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

  // El "Agregar" de cuenta corriente ahora sube un comprobante de
  // transferencia (con OCR) en vez de cargar un pago en efectivo a mano.
  // El motivo que mandamos es 'Cuota' nomás como etiqueta genérica: no hace
  // falta acertarle a "cuánto es seña y cuánto es cuota" acá — eso ya lo
  // resuelve solo registrar_pago_completo() del lado del backend, separando
  // el pago en dos filas si todavía falta cubrir la seña.
  guardarPago(): void
  {
    if (!this.formularioPago.fecha)
    {
      this.notificaciones.error({ title: 'Falta la fecha', description: 'Ingresá la fecha del pago.' });
      return;
    }

    const comprobante = this.comprobantePago();

    if (!comprobante.archivo)
    {
      this.notificaciones.error({ title: 'Falta el comprobante', description: 'Subí el comprobante de la transferencia.' });
      return;
    }

    if (!comprobante.entidadPago)
    {
      this.notificaciones.error({ title: 'Falta la entidad de pago', description: 'Indicá desde dónde se hizo la transferencia.' });
      return;
    }

    if (!comprobante.datos)
    {
      this.notificaciones.error({ title: 'Faltan datos del comprobante', description: 'No se pudieron verificar los datos del comprobante. Completalos a mano.' });
      return;
    }

    this.guardando.set(true);

    const formData = new FormData();
    formData.append('comprobante', comprobante.archivo, comprobante.archivo.name);
    formData.append('monto', String(comprobante.datos.monto));
    formData.append('motivo', 'Cuota');
    formData.append('fecha', this.formularioPago.fecha);
    formData.append('banco', comprobante.datos.banco);
    formData.append('entidad_pago', comprobante.entidadPago);
    formData.append('nroTransferencia', comprobante.datos.nro_transferencia);

    this.clientesPortalService.crearPago(formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarFormulario();
          this.cargarPagos();
          this.cargarCuotas();
          this.notificaciones.success({ title: 'Pago registrado', description: 'Tu pago quedó cargado y pendiente de confirmación del colegio.' });
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
