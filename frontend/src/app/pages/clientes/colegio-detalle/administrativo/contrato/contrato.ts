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
const CANTIDAD_MAXIMA_COMPRADORES = 3;

// Las fechas 'YYYY-MM-DD' que vienen de la base se arman en hora local.
// new Date('YYYY-MM-DD') las toma como UTC y en Argentina quedan un día antes
// (un día 1 termina mostrándose en el mes anterior).
function fechaLocal(fecha: string | Date): Date
{
  if (fecha instanceof Date) return fecha;

  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function formatearFecha(fecha: string | Date): string
{
  return fechaLocal(fecha).toLocaleDateString('es-AR');
}

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

  private idGrupo = 0;
  // Fecha de entrega guardada en el pedido ('YYYY-MM-DD'). Se carga al enviar el pedido a fábrica, no desde acá.
  private fechaEntregaAproximada: string | null = null;

  readonly cargando = signal(false);
  readonly descargando = signal(false);
  readonly contratoDisponible = signal(false);
  readonly datosContrato = signal<GenerarContratoDTO | null>(null);
  readonly firmas = signal<{ firmadas: number; total: number } | null>(null);

  ngOnInit(): void
  {
    this.inicializar();
  }

  private inicializar(): void
  {
    const idGrupo = Number(this.route.parent?.parent?.snapshot.paramMap.get('id'));
    this.idGrupo = idGrupo;

    this.cargando.set(true);

    forkJoin({
      presupuesto: this.gestionPedidosService.obtenerPresupuestoPedidoClientesPage(idGrupo),
      datosGrupo: this.gruposService.obtenerDatosGruposClientes(idGrupo),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ presupuesto, datosGrupo }) => {
          const aprobado = presupuesto.pedido.fecha_aprobacion_talles != null
            && presupuesto.pedido.fecha_aprobacion_boceto != null;

          this.contratoDisponible.set(aprobado);

          if (!aprobado)
          {
            this.cargando.set(false);
            return;
          }

          const firmantes = (datosGrupo.padresResponsables ?? []).slice(0, CANTIDAD_MAXIMA_COMPRADORES);
          this.firmas.set({ firmadas: firmantes.filter((padre) => padre.firma != null).length, total: firmantes.length });
          this.fechaEntregaAproximada = presupuesto.pedido.fecha_entrega_aproximada ?? null;

          this.cuotasService.traerCuotasIdPedido(presupuesto.pedido.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (cuotas) => {
                const cuotasOrdenadas = [...cuotas].sort((a, b) => a.numero - b.numero);
                this.datosContrato.set(this.armarDatosContrato(presupuesto, datosGrupo, cuotasOrdenadas));
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
      .slice(0, CANTIDAD_MAXIMA_COMPRADORES)
      .map((padre) => ({ nombre: `${padre.nombre} ${padre.apellido}`.trim(), dni: padre.dni }));

    const productos = presupuesto.productosPedido.map((producto) => ({
      cantidad: producto.cantidad,
      producto: producto.nombreProductoOriginal,
    }));

    const beneficios = (presupuesto.beneficios ?? []).map((b) => `${b.cantidad} ${b.beneficio}`);

    // La seña queda fija desde la primera modificación del plan (senia_total); si es null, la suma de los productos
    const montoSenia = presupuesto.pedido.senia_total
      ?? presupuesto.productosPedido.reduce((total, producto) => total + producto.valor_senia * producto.cantidad, 0);

    const montoCuotas = cuotas.reduce((total, cuota) => total + (cuota.importe ?? 0), 0);

    const entrega = this.mesYAnioDeFecha(this.fechaEntregaAproximada);

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
      cuotas: cuotas.map((cuota) => ({
        monto: cuota.importe,
        vencimiento: formatearFecha(cuota.fecha_vencimiento),
      })),
      mesEntrega: entrega ? MESES[entrega.mes - 1] : '',
      anioEntrega: entrega ? String(entrega.anio) : '',
    };
  }

  private fechaAprobacionMasReciente(pedido: { fecha_aprobacion_boceto: string | null; fecha_aprobacion_talles: string | null }): { dia: string; mes: string; anio: string }
  {
    const fechas = [pedido.fecha_aprobacion_boceto, pedido.fecha_aprobacion_talles]
      .filter((fecha): fecha is string => !!fecha)
      .map((fecha) => fechaLocal(fecha));

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

  private mesYAnioDeFecha(fecha: string | null): { mes: number; anio: number } | null
  {
    if (!fecha) return null;

    const [anio, mes] = fecha.slice(0, 10).split('-').map(Number);
    if (!anio || !mes) return null;

    return { mes, anio };
  }

  descargarContrato(): void
  {
    const dto = this.datosContrato();
    if (!dto) return;

    // La fecha de entrega ya no se pide acá: se establece al enviar el pedido a fábrica
    if (!this.fechaEntregaAproximada)
    {
      this.notificaciones.error({
        title: 'Falta la fecha de entrega',
        description: 'Todavía no se estableció la fecha de entrega aproximada. Se carga al enviar el pedido a fábrica.',
      });
      return;
    }

    this.generarYDescargarContrato(dto);
  }

  private async generarYDescargarContrato(dto: GenerarContratoDTO): Promise<void>
  {
    this.descargando.set(true);

    try
    {
      const blob = await firstValueFrom(this.pagosService.descargarContrato(this.idGrupo));
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
