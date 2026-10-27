import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ContactoResponsableDTO, ControlTallesDisenioDTO } from '../../services/gestionPedidos/dto/ControlTallesDisenioDTO';
import { UsuarioResponseConNombreRol } from '../../services/usuarios/dto/usuarioResponseNombreRol';
import { GestionPedidosService } from '../../services/gestionPedidos/gestion-pedidos-service';
import { UsuarioService } from '../../services/usuarios/usuario-service';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { AlumnoResponsable } from '../../services/alumnoResponsable/alumno-responsable';
import { PadreResponsableService } from '../../services/padreResponsable/padre-responsable-service';
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
  private readonly alumnoResponsableService = inject(AlumnoResponsable);
  private readonly padreResponsableService = inject(PadreResponsableService);
  private readonly usuariosService = inject(UsuarioService);
  private readonly notificaciones = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pedidosTallesDisenio = signal<ControlTallesDisenioDTO[] | null>(null);
  readonly diseniadoras = signal<UsuarioResponseConNombreRol[] | null>(null);
  readonly cargando = signal(false);
  readonly resumenExpandido = signal(true);
  readonly promosColapsadas = signal<Set<number>>(new Set());
  readonly planesColapsados = signal<Set<string>>(new Set());

  // Filtro "Diseñado por": null = todas, 0 = sin asignar, >0 = id de la diseñadora
  readonly filtroDiseniadora = signal<number | null>(null);

  readonly pedidosFiltrados = computed(() => {
    const pedidos = this.pedidosTallesDisenio() ?? [];
    const filtro = this.filtroDiseniadora();
    if (filtro === null) return pedidos;
    return pedidos.filter((p) => (p.diseniadora ?? 0) === filtro);
  });

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

  // Clase de color de cada estado (boceto y talles)
  private readonly coloresEstado: Record<string, string> = {
    'Diseñado': 'estado--verde',
    'En proceso': 'estado--amarillo',
    'Info lista - Pendiente': 'estado--azul',
    'Esperando información': 'estado--rojo',
    'Confirmado': 'estado--verde',
    'Cargando': 'estado--amarillo',
    'No accedió': 'estado--rojo',
  };

  readonly totalColumnas = 10;

  readonly estadosDisenio = [
    'Diseñado',
    'Esperando información',
    'En proceso',
    'Info lista - Pendiente',
  ];

  // Edición del contacto principal (alumnos en Secundaria, padres en el resto de niveles)
  readonly edicionTelefonoId = signal<number | null>(null);
  responsablePrincipalEnEdicion: number | null = null;


  readonly totalCargados = computed(() => this.pedidosFiltrados().length);

  readonly disenosAprobados = computed(() =>
    this.pedidosFiltrados().filter((p) => p.fechaAprobacionBoceto !== null).length,
  );

  readonly planillasTallesConfirmadas = computed(() =>
    this.pedidosFiltrados().filter((p) => p.estadoTalles === 'Confirmado').length,
  );

  readonly enviadosProduccion = computed(() =>
    this.pedidosFiltrados().filter((p) => this.enviadoAProduccion(p)).length,
  );

  readonly resumenPlanesCuotas = computed<ResumenPlanCuotas[]>(() => {
    const pedidos = this.pedidosFiltrados();
    const etiquetas = this.etiquetasOrdenadas(pedidos);

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
    const pedidos = this.pedidosFiltrados();
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

  // Prioridad de producción: primero los planes con menos pagos en total.
  // A igual cantidad de pagos, "cuotas iguales" va antes que "seña + cuotas".
  private ordenPlan(pedido: ControlTallesDisenioDTO): number
  {
    return (pedido.nroCuotas + 1) * 2 + (pedido.senia ? 1 : 0);
  }

  private etiquetasOrdenadas(pedidos: ControlTallesDisenioDTO[]): string[]
  {
    const ordenPorEtiqueta = new Map<string, number>();
    for (const p of pedidos) ordenPorEtiqueta.set(this.etiquetaCuotas(p), this.ordenPlan(p));
    return [...ordenPorEtiqueta.entries()].sort((a, b) => a[1] - b[1]).map(([etiqueta]) => etiqueta);
  }

  claseEstado(estado: string | null): string
  {
    return estado ? (this.coloresEstado[estado] ?? '') : '';
  }

  cambiarFiltroDiseniadora(valor: string): void
  {
    this.filtroDiseniadora.set(valor === '' ? null : Number(valor));
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

  esSecundaria(pedido: ControlTallesDisenioDTO): boolean
  {
    return pedido.nivel === 'Secundaria';
  }

  // Secundaria: alumno responsable principal. Resto de niveles: padre responsable principal.
  // Si ninguno está marcado como principal se usa el primero cargado.
  responsablesContacto(pedido: ControlTallesDisenioDTO): ContactoResponsableDTO[]
  {
    return (this.esSecundaria(pedido) ? pedido.alumnosResponsables : pedido.padresResponsables) ?? [];
  }

  contactoPrincipal(pedido: ControlTallesDisenioDTO): ContactoResponsableDTO | null
  {
    const responsables = this.responsablesContacto(pedido);
    if (responsables.length === 0) return null;
    return responsables.find((r) => r.principal) ?? responsables[0];
  }

  telefonoContacto(pedido: ControlTallesDisenioDTO): string | null
  {
    return this.contactoPrincipal(pedido)?.telefono ?? null;
  }

  nombreResponsable(responsable: ContactoResponsableDTO | null): string
  {
    if (!responsable) return '';
    return [responsable.nombre, responsable.apellido].filter(Boolean).join(' ');
  }

  puedeEditarContacto(pedido: ControlTallesDisenioDTO): boolean
  {
    return this.responsablesContacto(pedido).length > 1;
  }

  nombreDiseñadora(idDiseñadora: number | null): string
  {
    if (idDiseñadora === null) return '';
    return this.diseniadoras()?.find((d) => d.id === idDiseñadora)?.nombre ?? '';
  }


  private agruparPorPlanCuotas(pedidos: ControlTallesDisenioDTO[], contadorFilas: { valor: number }): GrupoPlanCuotas[]
  {
    const etiquetas = this.etiquetasOrdenadas(pedidos);
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
    this.responsablePrincipalEnEdicion = this.contactoPrincipal(pedido)?.id ?? null;
  }

  cancelarEdicionTelefono(): void
  {
    this.edicionTelefonoId.set(null);
    this.responsablePrincipalEnEdicion = null;
  }

  guardarTelefono(pedido: ControlTallesDisenioDTO): void
  {
    const idNuevoPrincipal = this.responsablePrincipalEnEdicion;
    if (idNuevoPrincipal === null) return;

    if (this.contactoPrincipal(pedido)?.id === idNuevoPrincipal)
    {
      this.cancelarEdicionTelefono();
      return;
    }

    const secundaria = this.esSecundaria(pedido);
    const campo = secundaria ? 'alumnosResponsables' : 'padresResponsables';
    const peticion = secundaria
      ? this.alumnoResponsableService.modificarAlumnoPrincipal(pedido.idGrupo, idNuevoPrincipal)
      : this.padreResponsableService.modificarPadrePrincipal(pedido.idGrupo, idNuevoPrincipal);

    peticion.subscribe({
      next: () => {
        // Puede haber más de un pedido del mismo grupo en la tabla
        this.pedidosTallesDisenio.update((lista) =>
          lista
            ? lista.map((p) =>
                p.idGrupo === pedido.idGrupo
                  ? { ...p, [campo]: p[campo].map((r) => ({ ...r, principal: r.id === idNuevoPrincipal })) }
                  : p,
              )
            : lista,
        );
        this.cancelarEdicionTelefono();
      },
      error: () => {
        this.notificaciones.error({
          title: secundaria ? 'No se pudo actualizar el alumno principal' : 'No se pudo actualizar el adulto principal',
          description: 'Intentá nuevamente.',
        });
      },
    });
  }

  //--- Estado boceto ---

  modificarEstadoBoceto(pedido: ControlTallesDisenioDTO, nuevoEstado: string): void
  {
    // Con el boceto aprobado el estado queda bloqueado
    if (pedido.fechaAprobacionBoceto) return;

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
