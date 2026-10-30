import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { grupoClienteDatosPageResponse } from '../../../../services/grupos/dtos/grupoClienteDatosPage.dto';
import { GruposService } from '../../../../services/grupos/grupos-service';
import { AlumnoResponsable } from '../../../../services/alumnoResponsable/alumno-responsable';
import { alumnoResponsableResponseDTO } from '../../../../services/alumnoResponsable/dto/AlumnoResponsableResponseDTO';
import { PadreResponsableService } from '../../../../services/padreResponsable/padre-responsable-service';
import { PadreResponsableResponseDTO } from '../../../../services/padreResponsable/dto/padreResponsableResponse.dto';
import { ClientesAuthService } from '../../../../services/clientes-auth-service/clientes-auth-service';
import { NotificationService } from '../../../../shared/notifications/notification.service';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PedidosService } from '../../../../services/pedidos/pedidos-service';
import { PermisosService } from '../../../../services/permisos/permisos';
import { BancoDevolucion, GestionPedidosService } from '../../../../services/gestionPedidos/gestion-pedidos-service';

const ESTADO_CANCELADO = 'Cancelado';

@Component({
  selector: 'app-datos',
  imports: [DatePipe, FormsModule],
  templateUrl: './datos.html',
  styleUrl: './datos.css',
})
export class Datos implements OnInit
{
  private readonly gruposService = inject(GruposService);
  private readonly alumnoResponsableService = inject(AlumnoResponsable);
  private readonly padreResponsableService = inject(PadreResponsableService);
  private readonly clientesAuthService = inject(ClientesAuthService);
  private readonly notificaciones = inject(NotificationService);
  private readonly pedidosService = inject(PedidosService);
  private readonly permisosService = inject(PermisosService);
  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly datosColegio = signal<grupoClienteDatosPageResponse | null>(null);
  readonly cargando = signal(false);
  readonly padresResponsables = signal<PadreResponsableResponseDTO[]>([]);
  readonly alumnosResponsables = signal<alumnoResponsableResponseDTO[]>([]);
  readonly guardandoPadrePrincipalId = signal<number | null>(null);
  readonly guardandoPrincipalId = signal<number | null>(null);

  // Acceso a la plataforma de clientes
  readonly linkActivacion = signal<{ link: string; expira: string } | null>(null);
  readonly generandoLink = signal(false);

  // Cancelar pedido (baja del colegio)
  readonly bancosDevolucion: BancoDevolucion[] = ['COMAFI', 'Santander', 'Efectivo'];
  readonly idPedido = signal<number | null>(null);
  readonly estadoPedido = signal<string | null>(null);
  readonly modalCancelarAbierto = signal(false);
  readonly devolucionPlata = signal<boolean | null>(null);
  readonly bancoDevolucion = signal<BancoDevolucion | null>(null);
  readonly cancelando = signal(false);

  private readonly idGrupo = Number(this.route.parent?.snapshot.paramMap.get('id'));

  ngOnInit(): void
  {
    this.traerDatosColegio();
    this.traerAlumnosResponsables();
    this.traerPedido();
  }

  //--- Cancelar pedido ---

  private traerPedido(): void
  {
    this.pedidosService.obtenerPedidoGrupo(this.idGrupo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pedido) => {
          this.idPedido.set(pedido.id);
          this.estadoPedido.set(pedido.estado_general);
        },
        error: () => this.idPedido.set(null),
      });
  }

  pedidoCancelado(): boolean
  {
    return this.estadoPedido() === ESTADO_CANCELADO;
  }

  puedeCancelarPedido(): boolean
  {
    return this.permisosService.tienePermiso('modificar_pedidos') && this.idPedido() !== null && !this.pedidoCancelado();
  }

  abrirModalCancelar(): void
  {
    this.devolucionPlata.set(null);
    this.bancoDevolucion.set(null);
    this.modalCancelarAbierto.set(true);
  }

  cerrarModalCancelar(): void
  {
    if (this.cancelando()) return;
    this.modalCancelarAbierto.set(false);
  }

  cerrarModalDesdeFondo(event: MouseEvent): void
  {
    if (event.target === event.currentTarget) this.cerrarModalCancelar();
  }

  elegirDevolucion(devuelve: boolean): void
  {
    this.devolucionPlata.set(devuelve);
    if (!devuelve) this.bancoDevolucion.set(null);
  }

  // Hay que contestar si se devolvió la plata y, si se devolvió, desde qué cuenta
  cancelacionCompleta(): boolean
  {
    const devuelve = this.devolucionPlata();
    return devuelve === false || (devuelve === true && this.bancoDevolucion() !== null);
  }

  async confirmarCancelacion(): Promise<void>
  {
    const idPedido = this.idPedido();
    if (idPedido === null || !this.cancelacionCompleta() || this.cancelando()) return;

    const devuelve = this.devolucionPlata() === true;
    this.cancelando.set(true);

    try
    {
      await firstValueFrom(this.gestionPedidosService.cancelarPedido(idPedido, devuelve, devuelve ? this.bancoDevolucion()! : undefined));
      this.estadoPedido.set(ESTADO_CANCELADO);
      this.modalCancelarAbierto.set(false);
      this.notificaciones.success({
        title: 'Pedido cancelado',
        description: devuelve ? `Se registró la devolución desde ${this.bancoDevolucion()}.` : 'El colegio quedó dado de baja.',
      });
    }
    catch (e: any)
    {
      this.notificaciones.error({ title: 'No se pudo cancelar el pedido', description: e?.error?.message ?? 'Intentá nuevamente.' });
    }
    finally
    {
      this.cancelando.set(false);
    }
  }

  traerDatosColegio(): void
  {
    const idGrupo = this.idGrupo;

    this.cargando.set(true);

    this.gruposService.obtenerDatosGruposClientes(idGrupo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (datos) => {
          this.datosColegio.set(datos);
          this.padresResponsables.set(datos.padresResponsables ?? []);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los datos del colegio.' });
        },
      });
  }

  traerAlumnosResponsables(): void
  {
    this.alumnoResponsableService.traerAlumnosResponsables(this.idGrupo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (alumnos) => this.alumnosResponsables.set(alumnos),
        error: () => {
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los alumnos responsables.' });
        },
      });
  }

  generarLinkContrasena(): void
  {
    if (this.generandoLink()) return;

    this.generandoLink.set(true);

    this.clientesAuthService.generarLinkActivacion(this.idGrupo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.linkActivacion.set({ link: respuesta.link, expira: respuesta.expira });
          this.generandoLink.set(false);
        },
        error: () => {
          this.generandoLink.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudo generar el link para crear la contraseña.' });
        },
      });
  }

  async copiar(texto: string, que: string): Promise<void>
  {
    try
    {
      await navigator.clipboard.writeText(texto);
      this.notificaciones.success({ title: 'Copiado', description: `${que} copiado al portapapeles.` });
    }
    catch
    {
      this.notificaciones.error({ title: 'No se pudo copiar', description: 'Seleccioná el texto y copialo a mano.' });
    }
  }

  marcarPadrePrincipal(padre: PadreResponsableResponseDTO): void
  {
    if (padre.principal || this.guardandoPadrePrincipalId() !== null) return;

    this.guardandoPadrePrincipalId.set(padre.id);

    this.padreResponsableService.modificarPadrePrincipal(this.idGrupo, padre.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.padresResponsables.update((lista) => lista.map((p) => ({ ...p, principal: p.id === padre.id })));
          this.guardandoPadrePrincipalId.set(null);
        },
        error: () => {
          this.guardandoPadrePrincipalId.set(null);
          this.notificaciones.error({ title: 'Error', description: 'No se pudo cambiar el adulto principal.' });
        },
      });
  }

  marcarAlumnoPrincipal(alumno: alumnoResponsableResponseDTO): void
  {
    if (alumno.principal || this.guardandoPrincipalId() !== null) return;

    this.guardandoPrincipalId.set(alumno.id);

    this.alumnoResponsableService.modificarAlumnoPrincipal(this.idGrupo, alumno.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.alumnosResponsables.update((lista) => lista.map((a) => ({ ...a, principal: a.id === alumno.id })));
          this.guardandoPrincipalId.set(null);
        },
        error: () => {
          this.guardandoPrincipalId.set(null);
          this.notificaciones.error({ title: 'Error', description: 'No se pudo cambiar el alumno principal.' });
        },
      });
  }
}
