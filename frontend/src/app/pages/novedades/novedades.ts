import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Novedades as NovedadesService } from '../../services/novedades/novedades';
import { NovedadDTO } from '../../services/novedades/Novedad.dto';
import { PermisosService } from '../../services/permisos/permisos';
import { NotificationService } from '../../shared/notifications/notification.service';

interface DiaVentas
{
  titulo: string;
  fecha: Date;
  ventas: NovedadDTO[];
}

@Component({
  selector: 'app-novedades',
  imports: [DatePipe, RouterLink],
  templateUrl: './novedades.html',
  styleUrl: './novedades.css',
})
export class Novedades implements OnInit
{
  private readonly novedadesService = inject(NovedadesService);
  private readonly permisosService = inject(PermisosService);
  private readonly notificaciones = inject(NotificationService);

  readonly puedeVerVentas = this.permisosService.tienePermiso('ver_novedades_ventas');
  readonly puedeVerProduccion = this.permisosService.tienePermiso('ver_novedades_produccion');

  readonly ventas = signal<NovedadDTO[] | null>(null);
  readonly produccion = signal<NovedadDTO[] | null>(null);
  readonly cargandoVentas = signal(false);
  readonly cargandoProduccion = signal(false);

  // Una tarjeta por día: hoy + los 2 días hábiles anteriores (mismo criterio que el back).
  // Ej: un lunes se ve lunes, viernes y jueves. Dentro de cada día, la venta más reciente va arriba.
  readonly ventasPorDia = computed<DiaVentas[]>(() => {
    const hoy = this.inicioDelDia(new Date());
    const dias: DiaVentas[] = [];

    const fecha = new Date(hoy);
    dias.push(this.crearDia(fecha, hoy));
    while (dias.length < 3)
    {
      fecha.setDate(fecha.getDate() - 1);
      if (fecha.getDay() !== 0 && fecha.getDay() !== 6) dias.push(this.crearDia(fecha, hoy));
    }

    for (const venta of this.ventas() ?? [])
    {
      if (!venta.fecha) continue;
      const diaVenta = this.inicioDelDia(new Date(venta.fecha));
      dias.find((dia) => dia.fecha.getTime() === diaVenta.getTime())?.ventas.push(venta);
    }

    for (const dia of dias)
    {
      dia.ventas.sort((a, b) => new Date(b.fecha!).getTime() - new Date(a.fecha!).getTime());
    }

    return dias;
  });

  readonly totalVentas = computed(() =>
    this.ventasPorDia().reduce((acumulador, dia) => acumulador + dia.ventas.length, 0),
  );

  readonly produccionOrdenada = computed(() =>
    [...(this.produccion() ?? [])].sort((a, b) => a.colegio.localeCompare(b.colegio, 'es')),
  );

  ngOnInit(): void
  {
    if (this.puedeVerVentas) this.traerVentas();
    if (this.puedeVerProduccion) this.traerProduccion();
  }

  traerVentas(): void
  {
    this.cargandoVentas.set(true);
    this.novedadesService.obtenerNovedadesVentas().subscribe({
      next: (ventas) => {
        this.ventas.set(ventas);
        this.cargandoVentas.set(false);
      },
      error: () => {
        this.cargandoVentas.set(false);
        this.notificaciones.error({
          title: 'No se pudieron cargar las ventas recientes',
          description: 'Intentá nuevamente en unos minutos.',
        });
      },
    });
  }

  traerProduccion(): void
  {
    this.cargandoProduccion.set(true);
    this.novedadesService.obtenerNovedadesProduccion().subscribe({
      next: (pedidos) => {
        this.produccion.set(pedidos);
        this.cargandoProduccion.set(false);
      },
      error: () => {
        this.cargandoProduccion.set(false);
        this.notificaciones.error({
          title: 'No se pudieron cargar los pedidos para producción',
          description: 'Intentá nuevamente en unos minutos.',
        });
      },
    });
  }

  // "Hoy", "Ayer" o el nombre del día ("Viernes") cuando no es consecutivo
  private crearDia(fecha: Date, hoy: Date): DiaVentas
  {
    const diferenciaDias = Math.round((hoy.getTime() - fecha.getTime()) / 86_400_000);
    let titulo: string;
    if (diferenciaDias === 0) titulo = 'Hoy';
    else if (diferenciaDias === 1) titulo = 'Ayer';
    else
    {
      const nombreDia = fecha.toLocaleDateString('es-AR', { weekday: 'long' });
      titulo = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
    }

    return { titulo, fecha: new Date(fecha), ventas: [] };
  }

  private inicioDelDia(fecha: Date): Date
  {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  }
}
