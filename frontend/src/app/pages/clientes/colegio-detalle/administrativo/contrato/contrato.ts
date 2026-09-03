import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, firstValueFrom } from 'rxjs';
import { GestionPedidosService } from '../../../../../services/gestionPedidos/gestion-pedidos-service';
import { GruposService } from '../../../../../services/grupos/grupos-service';
import { CuotasService } from '../../../../../services/cuotas/cuotas-service';
import { PagosService } from '../../../../../services/pagos/pagos-service';
import { NotificationService } from '../../../../../shared/notifications/notification.service';
import { presupuestoPedidoClientesPage } from '../../../../../services/gestionPedidos/dto/PresupuestoPedidoClientePage.dto';
import { grupoClienteDatosPageResponse } from '../../../../../services/grupos/dtos/grupoClienteDatosPage.dto';
import { CuotaResponseDTO } from '../../../../../services/cuotas/dto/CuotaResponseDTO';
import { GenerarContratoDTO } from '../../../../../../interfaces/generarContrato.dto';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const ESTADO_APROBADO = 'Aprobado';

// TODO: todavía no hay una fuente real para la fecha de entrega pactada -- se
// hardcodea a 2030 a propósito para que sea evidente que hay que corregirlo.
const MES_ENTREGA_PROVISORIO = 'diciembre';
const ANIO_ENTREGA_PROVISORIO = '2030';

@Component({
  selector: 'app-contrato',
  imports: [CurrencyPipe],
  templateUrl: './contrato.html',
  styleUrl: './contrato.css',
})
export class Contrato implements OnInit
{
  private readonly route = inject(ActivatedRoute);
  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly gruposService = inject(GruposService);
  private readonly cuotasService = inject(CuotasService);
  private readonly pagosService = inject(PagosService);
  private readonly notificaciones = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cargando = signal(false);
  readonly descargando = signal(false);
  readonly contratoDisponible = signal(false);
  readonly datosContrato = signal<GenerarContratoDTO | null>(null);

  ngOnInit(): void
  {
    this.inicializar();
  }

  private inicializar(): void
  {
    const idGrupo = Number(this.route.parent?.parent?.snapshot.paramMap.get('id'));

    this.cargando.set(true);

    forkJoin({
      presupuesto: this.gestionPedidosService.obtenerPresupuestoPedidoClientesPage(idGrupo),
      datosGrupo: this.gruposService.obtenerDatosGruposClientes(idGrupo),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ presupuesto, datosGrupo }) => {
          const aprobado = presupuesto.pedido.estado_boceto === ESTADO_APROBADO
            && presupuesto.pedido.estado_talles === ESTADO_APROBADO;

          this.contratoDisponible.set(aprobado);

          if (!aprobado)
          {
            this.cargando.set(false);
            return;
          }

          this.cuotasService.traerCuotasIdPedido(presupuesto.pedido.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (cuotas) => {
                this.datosContrato.set(this.armarDatosContrato(presupuesto, datosGrupo, cuotas));
                this.cargando.set(false);
              },
              error: () => {
                this.cargando.set(false);
                this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener las cuotas del pedido.' });
              },
            });
        },
        error: () => {
          this.cargando.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los datos del colegio.' });
        },
      });
  }

  private armarDatosContrato(
    presupuesto: presupuestoPedidoClientesPage,
    datosGrupo: grupoClienteDatosPageResponse,
    cuotas: CuotaResponseDTO[],
  ): GenerarContratoDTO
  {
    const { dia, mes, anio } = this.fechaAprobacionMasReciente(presupuesto.pedido);

    const compradores = (datosGrupo.padresResponsables ?? [])
      .slice(0, 2)
      .map((padre) => ({ nombre: `${padre.nombre} ${padre.apellido}`.trim(), dni: padre.dni }));

    const productos = presupuesto.productosPedido.map((producto) => ({
      cantidad: producto.cantidad,
      producto: producto.nombreProductoOriginal,
    }));

    const beneficios = [...new Set(
      presupuesto.productosPedido
        .map((producto) => producto.beneficio)
        .filter((beneficio): beneficio is string => !!beneficio),
    )];

    const montoSenia = presupuesto.productosPedido
      .reduce((total, producto) => total + producto.valor_senia * producto.cantidad, 0);

    const cuotasOrdenadas = [...cuotas].sort((a, b) => a.numero - b.numero);
    const montoCuotas = cuotasOrdenadas.reduce((total, cuota) => total + (cuota.importe ?? 0), 0);

    return {
      diaFecha: dia,
      mesFecha: mes,
      anioFecha: anio,
      compradores,
      colegioNombre: datosGrupo.grupo.colegio?.nombre ?? '',
      turno: datosGrupo.grupo.turno,
      orientacion: datosGrupo.grupo.orientacion,
      localidad: datosGrupo.grupo.colegio?.localidad ?? '',
      provincia: datosGrupo.grupo.colegio?.provincia ?? '',
      productos,
      beneficios,
      tieneSenia: montoSenia > 0,
      montoSenia: montoSenia > 0 ? montoSenia : undefined,
      montoTotal: montoSenia + montoCuotas,
      cuotas: cuotasOrdenadas.map((cuota) => ({
        monto: cuota.importe,
        vencimiento: new Date(cuota.fecha_vencimiento).toLocaleDateString('es-AR'),
      })),
      mesEntrega: MES_ENTREGA_PROVISORIO,
      anioEntrega: ANIO_ENTREGA_PROVISORIO,
    };
  }

  private fechaAprobacionMasReciente(pedido: { fecha_aprobacion_boceto: string | null; fecha_aprobacion_talles: string | null }): { dia: string; mes: string; anio: string }
  {
    const fechas = [pedido.fecha_aprobacion_boceto, pedido.fecha_aprobacion_talles]
      .filter((fecha): fecha is string => !!fecha)
      .map((fecha) => new Date(fecha));

    const fechaMasReciente = fechas.length
      ? new Date(Math.max(...fechas.map((fecha) => fecha.getTime())))
      : new Date();

    return {
      dia: String(fechaMasReciente.getDate()),
      mes: MESES[fechaMasReciente.getMonth()],
      anio: String(fechaMasReciente.getFullYear()),
    };
  }

  nombresCompradores(dto: GenerarContratoDTO): string
  {
    return dto.compradores.map((comprador) => comprador.nombre).join(', ');
  }

  async descargarContrato(): Promise<void>
  {
    const dto = this.datosContrato();
    if (!dto) return;

    this.descargando.set(true);

    try
    {
      const blob = await firstValueFrom(this.pagosService.descargarContrato(dto));
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `contrato-${dto.colegioNombre}.pdf`;
      enlace.click();
      window.URL.revokeObjectURL(url);
    }
    catch
    {
      this.notificaciones.error({ title: 'Error', description: 'No se pudo generar el contrato.' });
    }
    finally
    {
      this.descargando.set(false);
    }
  }
}
