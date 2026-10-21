import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { GestionPedidosService } from '../../services/gestionPedidos/gestion-pedidos-service';
import { ControlProduccionDTO, EstadoPrenda } from '../../services/gestionPedidos/dto/ControlProduccionDTO';
import { CategoriaPrenda, PedidosService } from '../../services/pedidos/pedidos-service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { ConfirmationService } from '../../services/confirmation/confirmation.service';

type Pestania = 'pendientes' | 'enviados';
type EstadoPrendaGuardado = 'Ok' | 'Pendiente';

const ESTADO_EN_PRODUCCION = 'En producción';
const ESTADO_ENTREGADO = 'Entregado';

// Estados que se muestran en "Estado del pedido" (los dos primeros se calculan con las prendas)
const ESTADO_PENDIENTE_ENTREGA = 'Pendiente de entrega';
const ESTADO_LISTO_ENTREGAR = 'Listo para entregar - Completo';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface ColumnaPrenda
{
  categoria: CategoriaPrenda;
  titulo: string;
}

interface EnvioFabrica
{
  pedido: ControlProduccionDTO;
  mes: number | null;
  anio: number | null;
}

@Component({
  selector: 'app-control-fabrica',
  imports: [FormsModule],
  templateUrl: './control-fabrica.html',
  styleUrl: './control-fabrica.css',
})
export class ControlFabrica implements OnInit
{
  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly pedidosService = inject(PedidosService);
  private readonly notificaciones = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly hoy = new Date();
  private readonly anioActual = this.hoy.getFullYear();

  readonly pestania = signal<Pestania>('enviados');
  readonly mesSeleccionado = signal(this.hoy.getMonth() + 1);
  readonly anioSeleccionado = signal(this.anioActual);

  readonly pedidos = signal<ControlProduccionDTO[] | null>(null);
  readonly cargando = signal(false);
  // "idPedido-campo" que se está guardando, para deshabilitar ese select mientras tanto
  readonly guardando = signal<string | null>(null);

  readonly envio = signal<EnvioFabrica | null>(null);
  readonly enviando = signal(false);

  readonly meses = MESES.map((nombre, indice) => ({ valor: indice + 1, nombre }));
  readonly aniosFiltro = Array.from({ length: 6 }, (_, i) => this.anioActual - 3 + i);
  readonly aniosEntrega = Array.from({ length: 4 }, (_, i) => this.anioActual + i);

  readonly columnasPrendas: ColumnaPrenda[] = [
    { categoria: 'camperas_buzos', titulo: 'Camperas / Buzos' },
    { categoria: 'chombas_remeras', titulo: 'Chombas / Remeras' },
    { categoria: 'pantalon', titulo: 'Pantalón' },
    { categoria: 'bandera', titulo: 'Bandera' },
  ];

  readonly estadoListoEntregar = ESTADO_LISTO_ENTREGAR;
  readonly estadoEntregado = ESTADO_ENTREGADO;

  // Totales de arriba (en "enviados" son del mes de entrega elegido)
  readonly totalColegios = computed(() => (this.pedidos() ?? []).length);

  readonly cantidadEntregados = computed(() =>
    (this.pedidos() ?? []).filter(p => this.estadoPedido(p) === ESTADO_ENTREGADO).length);

  readonly cantidadListos = computed(() =>
    (this.pedidos() ?? []).filter(p => this.estadoPedido(p) === ESTADO_LISTO_ENTREGAR).length);

  ngOnInit(): void
  {
    this.cargarPedidos();
  }

  // ── Carga y filtros ───────────────────────────────────────────────────

  cargarPedidos(): void
  {
    this.cargando.set(true);

    // En "pendientes" el back ignora mes y año (todavía no tienen fecha de entrega)
    this.gestionPedidosService
      .obtenerDatosControlProduccion(this.mesSeleccionado(), this.anioSeleccionado(), this.pestania() === 'enviados')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pedidos) => {
          this.pedidos.set(pedidos);
          this.cargando.set(false);
        },
        error: () => {
          this.pedidos.set([]);
          this.cargando.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los pedidos.' });
        },
      });
  }

  cambiarPestania(pestania: Pestania): void
  {
    if (this.pestania() === pestania) return;

    this.pestania.set(pestania);
    this.pedidos.set(null);
    this.cargarPedidos();
  }

  cambiarMes(mes: string | number): void
  {
    this.mesSeleccionado.set(Number(mes));
    this.cargarPedidos();
  }

  cambiarAnio(anio: string | number): void
  {
    this.anioSeleccionado.set(Number(anio));
    this.cargarPedidos();
  }

  // ── Formato ───────────────────────────────────────────────────────────

  // 'YYYY-MM-DD' → 'DD/MM/YYYY' sin pasar por Date (evita que en Argentina se corra un día)
  formatearFecha(fecha: string | null): string
  {
    if (!fecha) return '—';

    const [anio, mes, dia] = fecha.slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  }

  estadoPrenda(pedido: ControlProduccionDTO, categoria: CategoriaPrenda): EstadoPrenda
  {
    return pedido[categoria];
  }

  // ── Estados de prendas ────────────────────────────────────────────────

  async cambiarEstadoPrenda(pedido: ControlProduccionDTO, categoria: CategoriaPrenda, nuevoEstado: EstadoPrendaGuardado): Promise<void>
  {
    if (pedido[categoria] === nuevoEstado) return;

    this.guardando.set(`${pedido.idPedido}-${categoria}`);

    try
    {
      await firstValueFrom(this.pedidosService.modificarEstadoPrenda(pedido.idPedido, categoria, nuevoEstado));
      this.actualizarPedido(pedido.idPedido, { [categoria]: nuevoEstado });
    }
    catch
    {
      this.notificaciones.error({ title: 'Error', description: 'No se pudo actualizar el estado de la prenda.' });
      // Se recarga para que el select vuelva al valor guardado
      this.cargarPedidos();
    }
    finally
    {
      this.guardando.set(null);
    }
  }

  // ── Estado del pedido ─────────────────────────────────────────────────

  // Con el pedido en producción, el estado sale de las prendas (sin contar las que "No lleva")
  estadoPedido(pedido: ControlProduccionDTO): string
  {
    if (pedido.estado_pedido === ESTADO_ENTREGADO) return ESTADO_ENTREGADO;
    if (pedido.estado_pedido !== ESTADO_EN_PRODUCCION) return pedido.estado_pedido;

    const todasOk = this.columnasPrendas
      .map(columna => pedido[columna.categoria])
      .filter(estado => estado !== 'No lleva')
      .every(estado => estado === 'Ok');

    return todasOk ? ESTADO_LISTO_ENTREGAR : ESTADO_PENDIENTE_ENTREGA;
  }

  async marcarEntregado(pedido: ControlProduccionDTO, nuevoEstado: string, select: HTMLSelectElement): Promise<void>
  {
    if (nuevoEstado !== ESTADO_ENTREGADO) return;

    const confirmado = await this.confirmationService.confirm({
      title: 'Marcar como entregado',
      description: `¿Confirmás que el pedido de ${pedido.colegio} fue entregado?`,
    });

    if (!confirmado)
    {
      select.value = ESTADO_LISTO_ENTREGAR;
      return;
    }

    this.guardando.set(`${pedido.idPedido}-estado`);

    try
    {
      await firstValueFrom(this.pedidosService.modificarEstadoGeneral(ESTADO_ENTREGADO, pedido.idPedido));
      this.actualizarPedido(pedido.idPedido, { estado_pedido: ESTADO_ENTREGADO });
      this.notificaciones.success({ title: 'Pedido entregado', description: `${pedido.colegio} quedó como entregado.` });
    }
    catch
    {
      select.value = ESTADO_LISTO_ENTREGAR;
      this.notificaciones.error({ title: 'Error', description: 'No se pudo marcar el pedido como entregado.' });
    }
    finally
    {
      this.guardando.set(null);
    }
  }

  // ── Enviar a fábrica ──────────────────────────────────────────────────

  abrirEnvio(pedido: ControlProduccionDTO): void
  {
    this.envio.set({ pedido, mes: null, anio: null });
  }

  cerrarEnvio(): void
  {
    if (this.enviando()) return;
    this.envio.set(null);
  }

  actualizarEnvio(cambios: Partial<Pick<EnvioFabrica, 'mes' | 'anio'>>): void
  {
    this.envio.update(envio => envio ? { ...envio, ...cambios } : envio);
  }

  async confirmarEnvio(): Promise<void>
  {
    const envio = this.envio();
    if (!envio) return;

    const { pedido, mes, anio } = envio;

    if (!mes || !anio)
    {
      this.notificaciones.error({ title: 'Falta la fecha', description: 'Elegí el mes y el año de entrega aproximada.' });
      return;
    }

    const confirmado = await this.confirmationService.confirm({
      title: 'Enviar a fábrica',
      description: `Vas a enviar a fábrica el pedido de ${pedido.colegio} con entrega aproximada en ${MESES[mes - 1].toLowerCase()} de ${anio}. Se le asigna el número de pedido y el cliente va a poder ver el contrato. ¿Querés continuar?`,
    });
    if (!confirmado) return;

    this.enviando.set(true);

    try
    {
      const { nroFabrica, whatsappEnviado } = await firstValueFrom(
        this.gestionPedidosService.enviarPedidoFabrica(pedido.idPedido, mes, anio));

      // Deja de estar pendiente: sale de esta pestaña
      this.pedidos.update(pedidos => (pedidos ?? []).filter(p => p.idPedido !== pedido.idPedido));
      this.envio.set(null);

      this.notificaciones.success({ title: 'Enviado a fábrica', description: `${pedido.colegio} quedó en producción con el pedido N° ${nroFabrica}.` });

      if (!whatsappEnviado)
      {
        this.notificaciones.warning({ title: 'WhatsApp no enviado', description: 'El pedido se envió, pero no se pudo mandar el mensaje del contrato al cliente.' });
      }
    }
    catch (err: any)
    {
      this.notificaciones.error({ title: 'Error', description: err?.error?.message ?? 'No se pudo enviar el pedido a fábrica.' });
    }
    finally
    {
      this.enviando.set(false);
    }
  }

  // ── Auxiliares ────────────────────────────────────────────────────────

  private actualizarPedido(idPedido: number, cambios: Partial<ControlProduccionDTO>): void
  {
    this.pedidos.update(pedidos =>
      (pedidos ?? []).map(p => p.idPedido === idPedido ? { ...p, ...cambios } : p));
  }
}
