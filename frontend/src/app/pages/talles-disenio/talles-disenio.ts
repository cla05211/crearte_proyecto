import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ControlTallesDisenioDTO } from '../../services/gestionPedidos/dto/ControlTallesDisenioDTO';
import { UsuarioResponseConNombreRol } from '../../services/usuarios/dto/usuarioResponseNombreRol';
import { GestionPedidosService } from '../../services/gestionPedidos/gestion-pedidos-service';
import { UsuarioService } from '../../services/usuarios/usuario-service';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { NotificationService } from '../../shared/notifications/notification.service';

interface FilaPedido
{
  pedido: ControlTallesDisenioDTO;
  par: boolean;
}

interface GrupoPlanCuotas
{
  etiqueta: string;
  filas: FilaPedido[];
}

interface GrupoPromo
{
  promo: number;
  planes: GrupoPlanCuotas[];
}

interface ResumenPlanCuotas
{
  etiqueta: string;
  vendidos: number;
  subidosProduccion: number;
}

interface EdicionFechaTalles
{
  pedido: ControlTallesDisenioDTO;
  fecha: string;
}

@Component({
  selector: 'app-talles-disenio',
  imports: [FormsModule, DatePipe],
  templateUrl: './talles-disenio.html',
  styleUrl: './talles-disenio.css',
})
export class TallesDisenio
{
  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly pedidosService = inject(PedidosService);
  private readonly usuariosService = inject(UsuarioService);
  private readonly notificaciones = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pedidosTallesDisenio = signal<ControlTallesDisenioDTO[] | null>(null);
  readonly diseniadoras = signal<UsuarioResponseConNombreRol[] | null>(null);
  readonly cargando = signal(false);
  readonly resumenExpandido = signal(true);
  readonly promosColapsadas = signal<Set<number>>(new Set());
  readonly planesColapsados = signal<Set<string>>(new Set());

  private readonly busquedaCambiada$ = new Subject<string>();
  readonly busqueda = signal('');
  readonly busquedaInput = signal('');

  fechaActual: Date = new Date();
  anioActual = this.fechaActual.getFullYear();
  mesActual = this.fechaActual.getMonth() + 1;

  readonly anioSeleccionado = signal(this.anioActual);
  readonly mesSeleccionado = signal(this.mesActual);

  readonly anios = Array.from({ length: 6 }, (_, i) => this.anioActual - 3 + i);
  readonly meses = [
    { value: 1, nombre: 'Enero' },
    { value: 2, nombre: 'Febrero' },
    { value: 3, nombre: 'Marzo' },
    { value: 4, nombre: 'Abril' },
    { value: 5, nombre: 'Mayo' },
    { value: 6, nombre: 'Junio' },
    { value: 7, nombre: 'Julio' },
    { value: 8, nombre: 'Agosto' },
    { value: 9, nombre: 'Septiembre' },
    { value: 10, nombre: 'Octubre' },
    { value: 11, nombre: 'Noviembre' },
    { value: 12, nombre: 'Diciembre' },
  ];

  readonly estadosTalles = [
    'Pendiente de acceso',
    'Cargando en la plataforma',
    'Pide muestras físicas',
    'Enviada planilla',
    'Esperando confirmación',
    'Confirmado',
  ];

  readonly totalColumnas = 10;

  readonly estadosDisenio = [
    'Diseñado',
    'Esperando información',
    'En proceso',
    'Info lista - Pendiente',
  ];

  // Edición de teléfono
  readonly edicionTelefonoId = signal<number | null>(null);
  telefonoEnEdicion = '';

  // Edición de fecha de confirmación de talles (cuando se elige "Confirmado")
  readonly edicionFechaTalles = signal<EdicionFechaTalles | null>(null);

  readonly totalCargados = computed(() => (this.pedidosTallesDisenio() ?? []).length);

  readonly disenosAprobados = computed(() =>
    (this.pedidosTallesDisenio() ?? []).filter((p) => p.fechaAprobacionBoceto !== null).length,
  );

  readonly planillasTallesConfirmadas = computed(() =>
    (this.pedidosTallesDisenio() ?? []).filter((p) => p.estadoTalles === 'Confirmado').length,
  );

  readonly enviadosProduccion = computed(() =>
    (this.pedidosTallesDisenio() ?? []).filter((p) => this.enviadoAProduccion(p)).length,
  );

  readonly resumenPlanesCuotas = computed<ResumenPlanCuotas[]>(() => {
    const pedidos = this.pedidosTallesDisenio() ?? [];
    const etiquetas = [...new Set(pedidos.map((p) => this.etiquetaCuotas(p)))];

    return etiquetas.map((etiqueta) => {
      const delPlan = pedidos.filter((p) => this.etiquetaCuotas(p) === etiqueta);
      return {
        etiqueta,
        vendidos: delPlan.length,
        subidosProduccion: delPlan.filter((p) => this.enviadoAProduccion(p)).length,
      };
    });
  });

  readonly gruposPorPromo = computed<GrupoPromo[]>(() => {
    const pedidos = this.pedidosTallesDisenio() ?? [];
    const promos = [...new Set(pedidos.map((p) => p.promo))].sort((a, b) => a - b);
    const contadorFilas = { valor: 0 };

    return promos.map((promo) => ({
      promo,
      planes: this.agruparPorPlanCuotas(pedidos.filter((p) => p.promo === promo), contadorFilas),
    }));
  });

  ngOnInit(): void
  {
    this.traerPedidosTallesDisenio();
    this.traerDiseñadoras();
    this.inicializarBusquedaConDebounce();
  }

  private inicializarBusquedaConDebounce(): void
  {
    this.busquedaCambiada$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => {
        this.busqueda.set(valor.trim());
        this.traerPedidosTallesDisenio();
      });
  }

  actualizarBusqueda(valor: string): void
  {
    this.busquedaInput.set(valor);
    this.busquedaCambiada$.next(valor);
  }

  traerPedidosTallesDisenio(): void
  {
    this.cargando.set(true);
    const busqueda = this.busqueda().trim() || undefined;
    this.gestionPedidosService.obtenerDatosPedidosControlTallesDisenio(this.mesSeleccionado(), this.anioSeleccionado(), busqueda)
      .subscribe({
        next: (pedidos) => {
          this.pedidosTallesDisenio.set(pedidos);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.notificaciones.error({
            title: 'No se pudieron cargar los pedidos',
            description: 'Intentá nuevamente en unos minutos.',
          });
        },
      });
  }

  traerDiseñadoras(): void
  {
    this.usuariosService.traerUsuarios(4)
      .subscribe({
        next: (diseñadoras) => { this.diseniadoras.set(diseñadoras); },
      });
  }

  cambiarMes(valor: string): void
  {
    this.mesSeleccionado.set(Number(valor));
    this.traerPedidosTallesDisenio();
  }

  cambiarAnio(valor: string): void
  {
    this.anioSeleccionado.set(Number(valor));
    this.traerPedidosTallesDisenio();
  }

  etiquetaCuotas(pedido: ControlTallesDisenioDTO): string
  {
    return pedido.senia ? `${pedido.nroCuotas} Cuotas + Seña` : `${pedido.nroCuotas + 1} Cuotas iguales`;
  }

  enviadoAProduccion(pedido: ControlTallesDisenioDTO): boolean
  {
    return pedido.estadoTalles === 'Confirmado' && pedido.fechaAprobacionBoceto !== null && !this.pendientePago(pedido);
  }

  pendientePago(pedido: ControlTallesDisenioDTO): boolean
  {
    if (pedido.estadoTalles !== 'Confirmado' || pedido.fechaAprobacionBoceto === null) return false;
    if (pedido.senia && pedido.estadoPrimerCuota !== 'Pagada') return true;
    if (!pedido.senia && pedido.seniaPaga === false) return true;
    return false;
  }

  telefonoContacto(pedido: ControlTallesDisenioDTO): string | null
  {
    if (pedido.telefono_principal) return pedido.telefono_principal;
    if (pedido.nrosContactoAlumnos && pedido.nrosContactoAlumnos.length > 0) return pedido.nrosContactoAlumnos[0];
    if (pedido.nrosContactoPadres && pedido.nrosContactoPadres.length > 0) return pedido.nrosContactoPadres[0];
    return null;
  }

  nombreDiseñadora(idDiseñadora: number | null): string
  {
    if (idDiseñadora === null) return '';
    return this.diseniadoras()?.find((d) => d.id === idDiseñadora)?.nombre ?? '';
  }

  formatearFechaInput(fecha: Date | null): string
  {
    if (!fecha) return '';
    const d = new Date(fecha);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private agruparPorPlanCuotas(pedidos: ControlTallesDisenioDTO[], contadorFilas: { valor: number }): GrupoPlanCuotas[]
  {
    const etiquetas = [...new Set(pedidos.map((p) => this.etiquetaCuotas(p)))];
    return etiquetas.map((etiqueta) => ({
      etiqueta,
      filas: pedidos
        .filter((p) => this.etiquetaCuotas(p) === etiqueta)
        .map((pedido) => ({ pedido, par: contadorFilas.valor++ % 2 === 0 })),
    }));
  }

  alternarResumen(): void
  {
    this.resumenExpandido.update((abierto) => !abierto);
  }

  private clavePlan(promo: number, etiqueta: string): string
  {
    return `${promo}::${etiqueta}`;
  }

  estaPromoColapsada(promo: number): boolean
  {
    return this.promosColapsadas().has(promo);
  }

  estaPlanColapsado(promo: number, etiqueta: string): boolean
  {
    return this.planesColapsados().has(this.clavePlan(promo, etiqueta));
  }

  alternarPromo(promo: number): void
  {
    this.promosColapsadas.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(promo)) nuevo.delete(promo);
      else nuevo.add(promo);
      return nuevo;
    });
  }

  alternarPlan(promo: number, etiqueta: string): void
  {
    const clave = this.clavePlan(promo, etiqueta);
    this.planesColapsados.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(clave)) nuevo.delete(clave);
      else nuevo.add(clave);
      return nuevo;
    });
  }

  private actualizarPedidoLocal(id: number, cambios: Partial<ControlTallesDisenioDTO>): void
  {
    this.pedidosTallesDisenio.update((lista) =>
      lista ? lista.map((p) => (p.id === id ? { ...p, ...cambios } : p)) : lista,
    );
  }

  //--- Edición de teléfono ---

  abrirEdicionTelefono(pedido: ControlTallesDisenioDTO): void
  {
    this.edicionTelefonoId.set(pedido.id);
    this.telefonoEnEdicion = this.telefonoContacto(pedido) ?? '';
  }

  cancelarEdicionTelefono(): void
  {
    this.edicionTelefonoId.set(null);
    this.telefonoEnEdicion = '';
  }

  guardarTelefono(pedido: ControlTallesDisenioDTO): void
  {
    const nuevoNro = this.telefonoEnEdicion.trim();
    if (!nuevoNro) return;

    this.pedidosService.modificarTelefonoPrincipal(nuevoNro, pedido.id).subscribe({
      next: () => {
        this.actualizarPedidoLocal(pedido.id, { telefono_principal: nuevoNro });
        this.cancelarEdicionTelefono();
      },
      error: () => {
        this.notificaciones.error({
          title: 'No se pudo actualizar el teléfono',
          description: 'Intentá nuevamente.',
        });
      },
    });
  }

  //--- Estado boceto ---

  modificarEstadoBoceto(pedido: ControlTallesDisenioDTO, nuevoEstado: string): void
  {
    this.pedidosService.modificarEstadoDisenio(nuevoEstado, pedido.id).subscribe({
      next: () => { this.actualizarPedidoLocal(pedido.id, { estadoBoceto: nuevoEstado }); },
      error: () => {
        this.notificaciones.error({
          title: 'No se pudo actualizar el estado de boceto',
          description: 'Intentá nuevamente.',
        });
      },
    });
  }

  //--- Fecha de aprobación del boceto ---

  modificarFechaAprobacion(pedido: ControlTallesDisenioDTO, valor: string): void
  {
    if (!valor) return;

    this.pedidosService.modificarFechaAprobacionDisenio(valor, pedido.id).subscribe({
      next: () => {
        this.actualizarPedidoLocal(pedido.id, { fechaAprobacionBoceto: new Date(`${valor}T00:00:00`) });
      },
      error: () => {
        this.notificaciones.error({
          title: 'No se pudo actualizar la fecha de aprobación',
          description: 'Intentá nuevamente.',
        });
      },
    });
  }

  //--- Estado talles ---

  cambiarEstadoTalles(pedido: ControlTallesDisenioDTO, nuevoEstado: string): void
  {
    if (nuevoEstado === 'Confirmado')
    {
      this.edicionFechaTalles.set({ pedido, fecha: this.formatearFechaInput(this.fechaActual) });
      return;
    }

    this.guardarEstadoTalles(pedido, nuevoEstado);
  }

  actualizarFechaEdicionTalles(fecha: string): void
  {
    this.edicionFechaTalles.update((actual) => (actual ? { ...actual, fecha } : actual));
  }

  confirmarFechaTalles(): void
  {
    const edicion = this.edicionFechaTalles();
    if (!edicion || !edicion.fecha) return;

    this.guardarEstadoTalles(edicion.pedido, 'Confirmado', edicion.fecha);
    this.edicionFechaTalles.set(null);
  }

  cancelarFechaTalles(): void
  {
    this.edicionFechaTalles.set(null);
  }

  private guardarEstadoTalles(pedido: ControlTallesDisenioDTO, nuevoEstado: string, fechaConfirmacion?: string): void
  {
    this.pedidosService.modificarEstadoTalles(nuevoEstado, pedido.id, fechaConfirmacion).subscribe({
      next: () => {
        const cambios: Partial<ControlTallesDisenioDTO> = { estadoTalles: nuevoEstado };
        if (fechaConfirmacion) cambios.fechaAprobacionTalles = new Date(`${fechaConfirmacion}T00:00:00`);
        this.actualizarPedidoLocal(pedido.id, cambios);
      },
      error: () => {
        this.notificaciones.error({
          title: 'No se pudo actualizar el estado de talles',
          description: 'Intentá nuevamente.',
        });
      },
    });
  }

  //--- Diseñadora ---

  cambiarDiseniadora(pedido: ControlTallesDisenioDTO, valor: string): void
  {
    const idDiseñadora = Number(valor);
    if (!idDiseñadora) return;

    this.pedidosService.modificarDiseniadora(idDiseñadora, pedido.id).subscribe({
      next: () => { this.actualizarPedidoLocal(pedido.id, { diseniadora: idDiseñadora }); },
      error: () => {
        this.notificaciones.error({
          title: 'No se pudo asignar la diseñadora',
          description: 'Intentá nuevamente.',
        });
      },
    });
  }
}
