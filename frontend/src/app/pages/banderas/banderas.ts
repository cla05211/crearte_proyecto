import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GestionPedidosService } from '../../services/gestionPedidos/gestion-pedidos-service';
import { UsuarioService } from '../../services/usuarios/usuario-service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { UsuarioResponseConNombreRol } from '../../services/usuarios/dto/usuarioResponseNombreRol';
import {
  BanderaDTO,
  ControlBanderasDTO,
  ESTADOS_BOCETO_BANDERA,
  EstadoBocetoBandera,
  ModificarBanderaDTO,
} from '../../services/gestionPedidos/dto/ControlBanderasDTO';

// Un colegio (pedido) con las banderas que entran en una de las dos tablas
interface GrupoBanderas
{
  pedido: ControlBanderasDTO;
  banderas: BanderaDTO[];
  par: boolean;
}

// Modal de beneficio perdido
interface EdicionPerdida
{
  pedido: ControlBanderasDTO;
  bandera: BanderaDTO;
  motivo: string;
}

const ROL_DISENIADORA = 4;
const ESTADOS_DISENIADA: EstadoBocetoBandera[] = ['Diseñada', 'Confirmada'];

@Component({
  selector: 'app-banderas',
  imports: [FormsModule, DatePipe, NgTemplateOutlet],
  templateUrl: './banderas.html',
  styleUrl: './banderas.css',
})
export class Banderas
{
  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly usuariosService = inject(UsuarioService);
  private readonly notificaciones = inject(NotificationService);

  readonly pedidos = signal<ControlBanderasDTO[] | null>(null);
  readonly diseniadoras = signal<UsuarioResponseConNombreRol[] | null>(null);
  readonly cargando = signal(false);

  // Filtro "Diseñada por": null = todas, 0 = sin asignar, >0 = id de la diseñadora
  readonly filtroDiseniadora = signal<number | null>(null);

  readonly estadosBoceto = ESTADOS_BOCETO_BANDERA;

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

  private readonly coloresEstado: Record<EstadoBocetoBandera, string> = {
    'Pendiente de hablar': 'estado--amarillo',
    'Sin respuesta': 'estado--rojo',
    'Diseñada': 'estado--azul',
    'Confirmada': 'estado--verde',
  };

  // Pestaña visible: banderas con beneficio o las que lo perdieron
  readonly pestania = signal<'activas' | 'perdidas'>('activas');

  // Modal de beneficio perdido
  readonly edicionPerdida = signal<EdicionPerdida | null>(null);
  readonly guardandoPerdida = signal(false);

  // Pedidos con sus banderas ya filtradas por diseñadora (los que quedan sin banderas no se muestran)
  private readonly pedidosFiltrados = computed(() => {
    const filtro = this.filtroDiseniadora();
    return (this.pedidos() ?? [])
      .map((pedido) => ({
        pedido,
        banderas: filtro === null
          ? pedido.banderas
          : pedido.banderas.filter((b) => (b.idDisenadora ?? 0) === filtro),
      }))
      .filter((p) => p.banderas.length > 0);
  });

  readonly gruposActivos = computed(() => this.agrupar((b) => !this.perdioBeneficio(b)));
  readonly gruposPerdidos = computed(() => this.agrupar((b) => this.perdioBeneficio(b)));

  private readonly banderasFiltradas = computed(() =>
    this.pedidosFiltrados().flatMap((p) => p.banderas.map((bandera) => ({ bandera, pedido: p.pedido }))),
  );

  readonly totalBanderas = computed(() => this.banderasFiltradas().length);

  readonly enviadasProduccion = computed(() =>
    this.banderasFiltradas().filter((b) => b.bandera.enviadaProduccion).length,
  );

  readonly beneficioPerdido = computed(() =>
    this.banderasFiltradas().filter((b) => this.perdioBeneficio(b.bandera)).length,
  );

  // Las que perdieron el beneficio no cuentan como pendientes
  readonly pendientesDisenar = computed(() =>
    this.banderasFiltradas().filter((b) => !this.perdioBeneficio(b.bandera) && !ESTADOS_DISENIADA.includes(b.bandera.estadoBoceto)).length,
  );

  ngOnInit(): void
  {
    this.traerBanderas();
    this.traerDiseñadoras();
  }

  traerBanderas(): void
  {
    this.cargando.set(true);
    this.gestionPedidosService.obtenerPedidosControlBandera(this.mesSeleccionado(), this.anioSeleccionado())
      .subscribe({
        next: (pedidos) => {
          this.pedidos.set(pedidos);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.notificaciones.error({
            title: 'No se pudieron cargar las banderas',
            description: 'Intentá nuevamente en unos minutos.',
          });
        },
      });
  }

  traerDiseñadoras(): void
  {
    this.usuariosService.traerUsuarios(ROL_DISENIADORA)
      .subscribe({
        next: (diseñadoras) => { this.diseniadoras.set(diseñadoras); },
      });
  }

  cambiarMes(valor: string): void
  {
    this.mesSeleccionado.set(Number(valor));
    this.traerBanderas();
  }

  cambiarAnio(valor: string): void
  {
    this.anioSeleccionado.set(Number(valor));
    this.traerBanderas();
  }

  cambiarFiltroDiseniadora(valor: string): void
  {
    this.filtroDiseniadora.set(valor === '' ? null : Number(valor));
  }

  perdioBeneficio(bandera: BanderaDTO): boolean
  {
    return bandera.motivoPerdidaBeneficio !== null;
  }

  mensajeVacio(pestania: 'activas' | 'perdidas'): string
  {
    if (this.filtroDiseniadora() !== null) return 'No hay banderas asignadas a esta diseñadora en el mes y año seleccionados.';
    return pestania === 'activas'
      ? 'No se encontraron banderas con beneficio para el mes y año seleccionados.'
      : 'Ninguna bandera del mes y año seleccionados perdió el beneficio.';
  }

  claseEstado(estado: EstadoBocetoBandera): string
  {
    return this.coloresEstado[estado] ?? '';
  }

  // Agrupa por colegio las banderas que cumplen la condición; el "par" alterna por colegio, no por bandera
  private agrupar(condicion: (b: BanderaDTO) => boolean): GrupoBanderas[]
  {
    let contador = 0;
    return this.pedidosFiltrados()
      .map((p) => ({ pedido: p.pedido, banderas: p.banderas.filter(condicion) }))
      .filter((g) => g.banderas.length > 0)
      .map((g) => ({ ...g, par: contador++ % 2 === 0 }));
  }

  private actualizarBanderaLocal(idBandera: number, cambios: Partial<BanderaDTO>): void
  {
    this.pedidos.update((lista) =>
      lista
        ? lista.map((p) => ({
            ...p,
            banderas: p.banderas.map((b) => (b.id === idBandera ? { ...b, ...cambios } : b)),
          }))
        : lista,
    );
  }

  private guardarCambios(bandera: BanderaDTO, dto: ModificarBanderaDTO, cambiosLocales: Partial<BanderaDTO>, tituloError: string, alTerminar?: (ok: boolean) => void): void
  {
    this.gestionPedidosService.modificarBandera(bandera.id, dto).subscribe({
      next: () => {
        this.actualizarBanderaLocal(bandera.id, cambiosLocales);
        alTerminar?.(true);
      },
      error: () => {
        this.notificaciones.error({ title: tituloError, description: 'Intentá nuevamente.' });
        alTerminar?.(false);
      },
    });
  }

  //--- Estado boceto ---

  modificarEstadoBoceto(bandera: BanderaDTO, nuevoEstado: EstadoBocetoBandera): void
  {
    if (nuevoEstado === bandera.estadoBoceto) return;

    this.guardarCambios(bandera, { estadoBoceto: nuevoEstado }, { estadoBoceto: nuevoEstado }, 'No se pudo actualizar el estado de boceto');
  }

  //--- Enviada a producción ---

  alternarEnviadaProduccion(bandera: BanderaDTO): void
  {
    const nuevoValor = !bandera.enviadaProduccion;
    this.guardarCambios(bandera, { enviadaProduccion: nuevoValor }, { enviadaProduccion: nuevoValor }, 'No se pudo actualizar el envío a producción');
  }

  //--- Diseñadora ---

  cambiarDiseniadora(bandera: BanderaDTO, valor: number): void
  {
    // 0 = sin asignar
    const idDiseñadora = Number(valor) || null;
    const nombre = this.diseniadoras()?.find((d) => d.id === idDiseñadora)?.nombre ?? null;

    this.guardarCambios(bandera, { idDiseniadora: idDiseñadora }, { idDisenadora: idDiseñadora, disenadora: nombre }, 'No se pudo asignar la diseñadora');
  }

  //--- Beneficio perdido ---

  abrirPerdida(pedido: ControlBanderasDTO, bandera: BanderaDTO): void
  {
    this.edicionPerdida.set({ pedido, bandera, motivo: bandera.motivoPerdidaBeneficio ?? '' });
  }

  actualizarMotivo(motivo: string): void
  {
    this.edicionPerdida.update((actual) => (actual ? { ...actual, motivo } : actual));
  }

  cerrarPerdida(): void
  {
    if (this.guardandoPerdida()) return;
    this.edicionPerdida.set(null);
  }

  // Guarda el motivo: la bandera pasa a la tabla de beneficio perdido
  confirmarPerdida(): void
  {
    const edicion = this.edicionPerdida();
    const motivo = edicion?.motivo.trim();
    if (!edicion || !motivo) return;

    this.guardarPerdida(edicion.bandera, motivo, 'No se pudo marcar el beneficio como perdido');
  }

  // Borra el motivo: la bandera vuelve a la tabla principal
  restaurarBeneficio(): void
  {
    const edicion = this.edicionPerdida();
    if (!edicion) return;

    this.guardarPerdida(edicion.bandera, null, 'No se pudo restaurar el beneficio');
  }

  private guardarPerdida(bandera: BanderaDTO, motivo: string | null, tituloError: string): void
  {
    this.guardandoPerdida.set(true);
    this.guardarCambios(
      bandera,
      // El back interpreta el string vacío como "no perdió el beneficio"
      { motivoPerdidaBeneficio: motivo ?? '' },
      { motivoPerdidaBeneficio: motivo },
      tituloError,
      (ok) => {
        this.guardandoPerdida.set(false);
        // Si falló el modal queda abierto para no perder el motivo escrito
        if (ok) this.edicionPerdida.set(null);
      },
    );
  }
}
