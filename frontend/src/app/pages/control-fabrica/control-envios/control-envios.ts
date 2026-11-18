import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { GestionEnviosService } from '../../../services/gestionEnvios/gestion-envios-service';
import {
  CALENDARIOS_RETIRO, ColumnaDatoSimple, DatosSimplesEnvio, EMPRESAS_ENVIO, ESTADOS_ENVIO, FORMAS_ENTREGA,
  FormaEntrega, PAGOS_ENVIO, PAGOS_RETIRO, PedidoEntregadoDTO, PedidoEnvioDTO,
} from '../../../services/gestionEnvios/dto/PedidoEnvioDTO';
import { DocumentosService } from '../../../services/documentos/documentos-service';
import { StorageService } from '../../../services/storage/storage-service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { ConfirmationService } from '../../../services/confirmation/confirmation.service';

export type VistaEnvios = 'envios' | 'entregados';

// Campos de PedidoEnvioDTO que corresponde a cada columna del back
const CAMPO_DTO: Record<ColumnaDatoSimple, keyof PedidoEnvioDTO> = {
  estado: 'estado',
  pago_realizado: 'pagoRealizado',
  cant_bultos: 'cantBultos',
  empresa_envio: 'empresaEnvio',
  datos_envio: 'datosEnvio',
  calendario: 'calendario',
  fecha_entrega: 'fechaEntrega',
  forma_entrega: 'formaEntrega',
};

// Colores de cada opción. Siguen el mismo agrupamiento que la planilla de envíos
// (qué opciones comparten color y cuáles se distinguen), con la paleta del sistema.
type Tono = 'verde' | 'rojo' | 'naranja' | 'violeta' | 'gris' | 'azul';

const TONOS: Record<string, Record<string, Tono>> = {
  estado:     { 'Hable': 'verde', 'Paga interés': 'gris', 'Cliente demorado': 'azul', 'Pendiente de hablar': 'rojo' },
  pago:       { 'Sí': 'verde', 'No': 'rojo', 'Efectivo': 'naranja' },
  empresa:    { 'Via cargo': 'violeta', 'Andreani': 'naranja' },
  calendario: { 'Agendado': 'verde', 'Pendiente': 'rojo', 'Comisionista': 'violeta' },
  forma:      { 'Envio': 'azul', 'Retiro oficina': 'violeta', 'Comisionista': 'naranja' },
};

interface EntregaPendiente
{
  pedido: PedidoEnvioDTO;
  fecha: string;
  forma: FormaEntrega;
}

@Component({
  selector: 'app-control-envios',
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './control-envios.html',
  styleUrls: ['../control-fabrica.css', './control-envios.css'],
})
export class ControlEnvios
{
  private readonly enviosService = inject(GestionEnviosService);
  private readonly documentosService = inject(DocumentosService);
  private readonly storageService = inject(StorageService);
  private readonly notificaciones = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly vista = input.required<VistaEnvios>();
  // Filtro de "Pedidos entregados" (lo eligen en el header de Control de fábrica)
  readonly mes = input.required<number>();
  readonly anio = input.required<number>();

  readonly pedidos = signal<PedidoEnvioDTO[] | null>(null);
  readonly entregados = signal<PedidoEntregadoDTO[] | null>(null);
  readonly cargando = signal(false);
  // "idPedido-campo" que se está guardando, para deshabilitar ese control mientras tanto
  readonly guardando = signal<string | null>(null);

  readonly entrega = signal<EntregaPendiente | null>(null);
  readonly confirmandoEntrega = signal(false);

  readonly estados = ESTADOS_ENVIO;
  readonly pagosEnvio = PAGOS_ENVIO;
  readonly pagosRetiro = PAGOS_RETIRO;
  readonly empresas = EMPRESAS_ENVIO;
  readonly calendarios = CALENDARIOS_RETIRO;
  readonly formasEntrega = FORMAS_ENTREGA;

  // Correo: forma 'Envio'. Retiro: 'Retiro oficina' (y 'Comisionista', si quedara alguno sin entregar)
  readonly pedidosCorreo = computed(() => (this.pedidos() ?? []).filter(p => p.formaEntrega === 'Envio'));
  readonly pedidosRetiro = computed(() => (this.pedidos() ?? []).filter(p => p.formaEntrega !== 'Envio'));

  constructor()
  {
    // Carga al entrar y, en "entregados", cada vez que cambian el mes o el año
    effect(() => {
      if (this.vista() === 'entregados')
      {
        this.mes();
        this.anio();
      }

      untracked(() => this.cargar());
    });
  }

  cargar(): void
  {
    this.cargando.set(true);

    if (this.vista() === 'entregados')
    {
      this.enviosService.obtenerPedidosEntregados(this.mes(), this.anio())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (entregados) => { this.entregados.set(entregados); this.cargando.set(false); },
          error: () => {
            this.entregados.set([]);
            this.cargando.set(false);
            this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los pedidos entregados.' });
          },
        });
      return;
    }

    this.enviosService.obtenerPedidosListosParaEnviar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pedidos) => { this.pedidos.set(pedidos); this.cargando.set(false); },
        error: () => {
          this.pedidos.set([]);
          this.cargando.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los pedidos para entregar.' });
        },
      });
  }

  // ── Formato ───────────────────────────────────────────────────────────

  // 'YYYY-MM-DD' → 'DD/MM/YYYY' sin pasar por Date (evita que en Argentina se corra un día)
  formatearFecha(fecha: string | null): string
  {
    if (!fecha) return '—';

    const [anio, mes, dia] = fecha.slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  }

  tono(campo: keyof typeof TONOS, valor: string): Tono | null
  {
    return TONOS[campo][valor] ?? null;
  }

  estaGuardando(pedido: PedidoEnvioDTO, campo: string): boolean
  {
    return this.guardando() === `${pedido.idPedido}-${campo}`;
  }

  // ── Datos simples ─────────────────────────────────────────────────────

  async modificarDato<C extends ColumnaDatoSimple>(pedido: PedidoEnvioDTO, columna: C, dato: DatosSimplesEnvio[C]): Promise<void>
  {
    if ((pedido[CAMPO_DTO[columna]] as unknown) === dato) return;

    this.guardando.set(`${pedido.idPedido}-${columna}`);

    try
    {
      await firstValueFrom(this.enviosService.modificarDato(pedido.idPedido, columna, dato));
      this.actualizarPedido(pedido.idPedido, { [CAMPO_DTO[columna]]: dato } as Partial<PedidoEnvioDTO>);
    }
    catch (err: any)
    {
      this.mostrarError(err, 'No se pudo guardar el cambio.');
      // Se recarga para que el control vuelva al valor guardado
      this.cargar();
    }
    finally
    {
      this.guardando.set(null);
    }
  }

  modificarBultos(pedido: PedidoEnvioDTO, valor: string, input: HTMLInputElement): void
  {
    const bultos = this.leerNumero(valor);

    if (bultos !== null && (!Number.isInteger(bultos) || bultos <= 0))
    {
      this.notificaciones.error({ title: 'Cantidad inválida', description: 'La cantidad de bultos tiene que ser un número entero mayor a 0.' });
      input.value = pedido.cantBultos?.toString() ?? '';
      return;
    }

    this.modificarDato(pedido, 'cant_bultos', bultos);
  }

  modificarEmpresa(pedido: PedidoEnvioDTO, empresa: string): void
  {
    // Con comprobante cargado no se puede dejar de ser Via cargo (lo frena el check de la tabla)
    if (pedido.idComprobante && empresa !== 'Via cargo')
    {
      this.notificaciones.error({ title: 'Tiene comprobante', description: 'Este envío ya tiene el comprobante de Via cargo cargado.' });
      this.cargar();
      return;
    }

    this.modificarDato(pedido, 'empresa_envio', (empresa || null) as DatosSimplesEnvio['empresa_envio']);
  }

  modificarFechaEntrega(pedido: PedidoEnvioDTO, fecha: string): void
  {
    this.modificarDato(pedido, 'fecha_entrega', fecha || null);
  }

  // Pasa el pedido de una tabla a la otra
  async moverPedido(pedido: PedidoEnvioDTO): Promise<void>
  {
    const destino: FormaEntrega = pedido.formaEntrega === 'Envio' ? 'Retiro oficina' : 'Envio';

    if (destino === 'Envio' && pedido.pagoRealizado === 'Efectivo')
    {
      this.notificaciones.error({ title: 'Pago en efectivo', description: 'El pago "Efectivo" es solo para retiro. Cambialo antes de pasarlo a envío por correo.' });
      return;
    }

    const confirmado = await this.confirmationService.confirm({
      title: destino === 'Envio' ? 'Pasar a envío por correo' : 'Pasar a retiro por oficina',
      description: `¿Querés pasar el pedido ${pedido.nroPedido ?? '#' + pedido.idPedido} a ${destino === 'Envio' ? 'envío por correo' : 'retiro por oficina'}?`,
    });
    if (!confirmado) return;

    await this.modificarDato(pedido, 'forma_entrega', destino);
  }

  // En "Pedidos entregados" solo se corrige la forma de entrega
  async modificarFormaEntregado(pedido: PedidoEntregadoDTO, forma: FormaEntrega): Promise<void>
  {
    if (pedido.formaEntrega === forma) return;

    this.guardando.set(`${pedido.idPedido}-forma_entrega`);

    try
    {
      await firstValueFrom(this.enviosService.modificarDato(pedido.idPedido, 'forma_entrega', forma));
      this.entregados.update(entregados =>
        (entregados ?? []).map(p => p.idPedido === pedido.idPedido ? { ...p, formaEntrega: forma } : p));
    }
    catch (err: any)
    {
      this.mostrarError(err, 'No se pudo cambiar la forma de entrega.');
      // Se recarga para que el select vuelva al valor guardado
      this.cargar();
    }
    finally
    {
      this.guardando.set(null);
    }
  }

  // ── Cotización ────────────────────────────────────────────────────────

  async modificarCotizacion(pedido: PedidoEnvioDTO, valor: string, input: HTMLInputElement): Promise<void>
  {
    const cotizacion = this.leerNumero(valor);

    if (cotizacion !== null && !(cotizacion >= 0))
    {
      this.notificaciones.error({ title: 'Cotización inválida', description: 'La cotización no puede ser negativa.' });
      input.value = pedido.cotizacion?.toString() ?? '';
      return;
    }

    if (cotizacion === pedido.cotizacion) return;

    this.guardando.set(`${pedido.idPedido}-cotizacion`);

    try
    {
      await firstValueFrom(this.enviosService.modificarCotizacion(pedido.idPedido, cotizacion));
      this.actualizarPedido(pedido.idPedido, { cotizacion });

      if (pedido.envioGratis)
      {
        this.notificaciones.success({ title: 'Cotización guardada', description: 'Como el envío es gratis, se actualizó el egreso en caja.' });
      }
    }
    catch (err: any)
    {
      input.value = pedido.cotizacion?.toString() ?? '';
      this.mostrarError(err, 'No se pudo guardar la cotización.');
    }
    finally
    {
      this.guardando.set(null);
    }
  }

  // ── Comprobante (solo Via cargo) ──────────────────────────────────────

  async subirComprobante(pedido: PedidoEnvioDTO, event: Event): Promise<void>
  {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';

    if (!archivo) return;

    this.guardando.set(`${pedido.idPedido}-comprobante`);

    try
    {
      const { idDocumento } = await firstValueFrom(this.enviosService.subirComprobante(pedido.idPedido, archivo));
      this.actualizarPedido(pedido.idPedido, { idComprobante: idDocumento });
      this.notificaciones.success({ title: 'Comprobante cargado', description: 'Se guardó el comprobante del envío.' });
    }
    catch (err: any)
    {
      this.mostrarError(err, 'No se pudo subir el comprobante.');
    }
    finally
    {
      this.guardando.set(null);
    }
  }

  async verComprobante(pedido: PedidoEnvioDTO): Promise<void>
  {
    if (!pedido.idComprobante) return;

    // Se abre antes del await para que el navegador no lo bloquee como popup
    const ventana = window.open('', '_blank');

    try
    {
      const ruta = (await firstValueFrom(this.documentosService.obtenerUrlArchivo(pedido.idComprobante))).url;
      const { url } = await firstValueFrom(this.storageService.obtenerUrlArchivo(ruta));

      if (ventana) ventana.location.href = url;
      else window.open(url, '_blank');
    }
    catch
    {
      ventana?.close();
      this.notificaciones.error({ title: 'Error', description: 'No se pudo abrir el comprobante.' });
    }
  }

  // ── Entrega ───────────────────────────────────────────────────────────

  // El select de "Entregado" vuelve a "No" y se abre el modal: recién al confirmar pasa a entregados
  abrirEntrega(pedido: PedidoEnvioDTO, select: HTMLSelectElement): void
  {
    select.value = 'No';

    const forma: FormaEntrega = pedido.formaEntrega === 'Envio'
      ? 'Envio'
      : pedido.calendario === 'Comisionista' ? 'Comisionista' : 'Retiro oficina';

    this.entrega.set({ pedido, fecha: this.hoyArgentina(), forma });
  }

  cerrarEntrega(): void
  {
    if (this.confirmandoEntrega()) return;
    this.entrega.set(null);
  }

  actualizarEntrega(cambios: Partial<Pick<EntregaPendiente, 'fecha' | 'forma'>>): void
  {
    this.entrega.update(entrega => entrega ? { ...entrega, ...cambios } : entrega);
  }

  async confirmarEntrega(): Promise<void>
  {
    const entrega = this.entrega();
    if (!entrega) return;

    if (!entrega.fecha)
    {
      this.notificaciones.error({ title: 'Falta la fecha', description: 'Elegí la fecha de entrega.' });
      return;
    }

    this.confirmandoEntrega.set(true);

    try
    {
      await firstValueFrom(this.enviosService.confirmarEntrega(entrega.pedido.idPedido, entrega.fecha, entrega.forma));
      this.pedidos.update(pedidos => (pedidos ?? []).filter(p => p.idPedido !== entrega.pedido.idPedido));
      this.entrega.set(null);
      this.notificaciones.success({
        title: 'Pedido entregado',
        description: `El pedido ${entrega.pedido.nroPedido ?? '#' + entrega.pedido.idPedido} pasó a Pedidos entregados.`,
      });
    }
    catch (err: any)
    {
      this.mostrarError(err, 'No se pudo confirmar la entrega.');
    }
    finally
    {
      this.confirmandoEntrega.set(false);
    }
  }

  // ── Auxiliares ────────────────────────────────────────────────────────

  private actualizarPedido(idPedido: number, cambios: Partial<PedidoEnvioDTO>): void
  {
    this.pedidos.update(pedidos =>
      (pedidos ?? []).map(p => p.idPedido === idPedido ? { ...p, ...cambios } : p));
  }

  private leerNumero(valor: string): number | null
  {
    if (valor.trim() === '') return null;

    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : NaN;
  }

  private hoyArgentina(): string
  {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
  }

  private mostrarError(err: any, porDefecto: string): void
  {
    this.notificaciones.error({ title: 'Error', description: err?.error?.message ?? porDefecto });
  }
}
