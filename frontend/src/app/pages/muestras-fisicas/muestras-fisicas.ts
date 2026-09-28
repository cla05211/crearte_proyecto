import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { MuestasFisicas as MuestrasFisicasService } from '../../services/muestrasFisicas/muestas-fisicas';
import { MuestrasTablaDTO } from '../../services/muestrasFisicas/dto/muestrasTabla.dto';
import { MuestrasFisicasResponseDTO } from '../../services/muestrasFisicas/dto/MuestrasFisicasResponse.dto';
import { PlanCuotasDTO } from '../../services/cuotas/dto/PlanDeCuotas.dto';
import { NotificationService } from '../../shared/notifications/notification.service';

type Pestania = 'activas' | 'devueltas';
type CampoFecha = 'fecha_entrega' | 'fecha_devolucion';

interface FilaMuestra
{
  item: MuestrasTablaDTO;
  par: boolean;
}

@Component({
  selector: 'app-muestras-fisicas',
  imports: [FormsModule],
  templateUrl: './muestras-fisicas.html',
  styleUrl: './muestras-fisicas.css',
})
export class MuestrasFisicas implements OnInit
{
  private readonly muestrasService = inject(MuestrasFisicasService);
  private readonly notificaciones = inject(NotificationService);

  readonly muestras = signal<MuestrasTablaDTO[] | null>(null);
  readonly cargando = signal(false);
  readonly pestania = signal<Pestania>('activas');

  // Fecha que se está editando cuando estaba vacía (se muestra "-" hasta que se hace clic)
  readonly edicionFecha = signal<{ id: number; campo: CampoFecha } | null>(null);

  // Modal que pide la fecha de devolución al pasar el estado a "Devuelto"
  readonly edicionDevolucion = signal<{ item: MuestrasTablaDTO; fecha: string } | null>(null);

  readonly totalColumnas = 9;

  readonly estados = ['Pendiente', 'Probando', 'Devuelto', 'Esperando envío', 'Preparada'];

  readonly opcionesMuestras = [
    'S-001', 'S-002', 'S-003', 'S-004', 'S-005', 'S-006', 'S-007', 'S-008',
    'P001', 'P002', 'P003', 'P004', 'P005', 'JARDIN', 'Pantalones',
    'S009', 'S010', 'S011', 'P007', 'P010', 'P009', 'P012', 'S012',
  ];

  readonly opcionesEnvio = [
    { valor: true, etiqueta: 'Envío' },
    { valor: false, etiqueta: 'Retiran por Oficina' },
  ];

  //--- Contadores ---

  readonly pendientesEntrega = computed(() =>
    this.contarEstados(['Pendiente', 'Esperando envío', 'Preparada']),
  );
  readonly probando = computed(() => this.contarEstados(['Probando']));
  readonly devueltas = computed(() => this.contarEstados(['Devuelto']));

  //--- Filas de cada pestaña ---

  readonly filas = computed<FilaMuestra[]>(() => {
    const verDevueltas = this.pestania() === 'devueltas';
    return (this.muestras() ?? [])
      .filter((m) => (this.estadoDe(m.muestra) === 'Devuelto') === verDevueltas)
      .map((item, i) => ({ item, par: i % 2 === 0 }));
  });

  ngOnInit(): void
  {
    this.traerMuestras();
  }

  traerMuestras(): void
  {
    this.cargando.set(true);
    this.muestrasService.traerMuestrasTabla().subscribe({
      next: (muestras) => {
        this.muestras.set(muestras);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.notificaciones.error({
          title: 'No se pudieron cargar las muestras',
          description: 'Intentá nuevamente en unos minutos.',
        });
      },
    });
  }

  cambiarPestania(pestania: Pestania): void
  {
    this.pestania.set(pestania);
  }

  //--- Formato ---

  estadoDe(muestra: MuestrasFisicasResponseDTO): string
  {
    return muestra.estado ?? 'Pendiente';
  }

  // Lo que muestra el desplegable de estado. Mientras el modal de devolución está abierto
  // muestra "Devuelto"; si se cancela vuelve al estado real y el desplegable se acomoda solo.
  estadoSeleccionado(muestra: MuestrasFisicasResponseDTO): string
  {
    return this.edicionDevolucion()?.item.muestra.id === muestra.id ? 'Devuelto' : this.estadoDe(muestra);
  }

  etiquetaCuotas(plan: PlanCuotasDTO): string
  {
    const cuotasIguales = Math.abs((plan.senia ?? 0) - (plan.importeCuota ?? 0)) < 0.01;
    return cuotasIguales ? `${plan.nroCuotas + 1} cuotas iguales` : `${plan.nroCuotas} + Seña`;
  }

  // Las fechas vienen como timestamptz ("2026-09-28T00:00:00+00:00"): tomamos solo la parte de la fecha
  // para no correr el día por la zona horaria.
  fechaInput(fecha: string | null): string
  {
    return fecha ? fecha.slice(0, 10) : '';
  }

  estaEditandoFecha(id: number, campo: CampoFecha): boolean
  {
    const edicion = this.edicionFecha();
    return edicion?.id === id && edicion.campo === campo;
  }

  abrirEdicionFecha(id: number, campo: CampoFecha): void
  {
    this.edicionFecha.set({ id, campo });
  }

  cerrarEdicionFecha(): void
  {
    this.edicionFecha.set(null);
  }

  private contarEstados(estados: string[]): number
  {
    return (this.muestras() ?? []).filter((m) => estados.includes(this.estadoDe(m.muestra))).length;
  }

  //--- Modificaciones ---

  cambiarEstado(item: MuestrasTablaDTO, estado: string): void
  {
    if (estado === 'Devuelto')
    {
      const fecha = this.fechaInput(item.muestra.fecha_devolucion) || this.hoy();
      this.edicionDevolucion.set({ item, fecha });
      return;
    }

    this.modificarEstado(item.muestra, estado);
  }

  modificarEstado(muestra: MuestrasFisicasResponseDTO, estado: string): void
  {
    this.guardar(this.muestrasService.modificarEstado(muestra.id, estado), muestra.id, { estado }, 'el estado');
  }

  modificarMuestras(muestra: MuestrasFisicasResponseDTO, muestras: string): void
  {
    this.guardar(this.muestrasService.modificarMuestras(muestra.id, muestras), muestra.id, { muestras }, 'las muestras');
  }

  modificarEnvio(muestra: MuestrasFisicasResponseDTO, envio: boolean): void
  {
    this.guardar(this.muestrasService.modificarEnvio(muestra.id, envio), muestra.id, { envio }, 'el envío / retiro');
  }

  modificarFecha(muestra: MuestrasFisicasResponseDTO, campo: CampoFecha, fecha: string): void
  {
    this.cerrarEdicionFecha();
    if (!fecha) return;

    const peticion = campo === 'fecha_entrega'
      ? this.muestrasService.modificarFechaEntrega(muestra.id, fecha)
      : this.muestrasService.modificarFechaDevolucion(muestra.id, fecha);

    // En el back, cargar la fecha de devolución también pasa el estado a "Devuelto"
    const cambios: Partial<MuestrasFisicasResponseDTO> = campo === 'fecha_entrega'
      ? { fecha_entrega: fecha }
      : { fecha_devolucion: fecha, estado: 'Devuelto' };
    const descripcion = campo === 'fecha_entrega' ? 'la fecha de entrega' : 'la fecha de devolución';
    this.guardar(peticion, muestra.id, cambios, descripcion);
  }

  //--- Modal de devolución ---

  actualizarFechaDevolucionModal(fecha: string): void
  {
    this.edicionDevolucion.update((actual) => (actual ? { ...actual, fecha } : actual));
  }

  confirmarDevolucion(): void
  {
    const edicion = this.edicionDevolucion();
    if (!edicion || !edicion.fecha) return;

    this.edicionDevolucion.set(null);
    this.modificarFecha(edicion.item.muestra, 'fecha_devolucion', edicion.fecha);
  }

  cancelarDevolucion(): void
  {
    this.edicionDevolucion.set(null);
  }

  private hoy(): string
  {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private guardar(peticion: Observable<void>, id: number, cambios: Partial<MuestrasFisicasResponseDTO>, descripcion: string): void
  {
    peticion.subscribe({
      next: () => this.actualizarMuestraLocal(id, cambios),
      error: () => {
        this.notificaciones.error({
          title: `No se pudo actualizar ${descripcion}`,
          description: 'Intentá nuevamente.',
        });
        // Se vuelve a pedir la lista para que el desplegable no quede mostrando un valor que no se guardó
        this.traerMuestras();
      },
    });
  }

  private actualizarMuestraLocal(id: number, cambios: Partial<MuestrasFisicasResponseDTO>): void
  {
    this.muestras.update((lista) =>
      lista
        ? lista.map((m) => (m.muestra.id === id ? { ...m, muestra: { ...m.muestra, ...cambios } } : m))
        : lista,
    );
  }
}
