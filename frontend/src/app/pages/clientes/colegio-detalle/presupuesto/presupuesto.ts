import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { GestionPedidosService } from '../../../../services/gestionPedidos/gestion-pedidos-service';
import { presupuestoPedidoClientesPage } from '../../../../services/gestionPedidos/dto/PresupuestoPedidoClientePage.dto';
import { ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../shared/notifications/notification.service';

@Component({
  selector: 'app-presupuesto',
  imports: [CurrencyPipe],
  templateUrl: './presupuesto.html',
  styleUrl: './presupuesto.css',
})
export class Presupuesto implements OnInit
{
  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly notificaciones = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly presupuestoGrupo = signal<presupuestoPedidoClientesPage | null>(null);
  readonly cargando = signal(false);

  readonly beneficioPedido = computed(() => this.presupuestoGrupo()?.productosPedido[0]?.beneficio || 'Sin beneficio');

  readonly totalSenia = computed(() =>
    (this.presupuestoGrupo()?.productosPedido ?? []).reduce(
      (total, producto) => total + producto.valor_senia * producto.cantidad,
      0,
    ),
  );

  readonly totalCuota = computed(() => {
    const productos = (this.presupuestoGrupo()?.productosPedido ?? []).reduce(
      (total, producto) => total + producto.valor_cuota * producto.cantidad,
      0,
    );
    const agregadosGlobales = (this.presupuestoGrupo()?.agregadosGlobales ?? []).reduce(
      (total, agregado) => total + agregado.precio,
      0,
    );
    return productos + agregadosGlobales;
  });

  ngOnInit(): void
  {
    this.traerPresupuestoGrupo();
  }

  traerPresupuestoGrupo(): void
  {
    const idGrupo = Number(this.route.parent?.snapshot.paramMap.get('id'));

    this.cargando.set(true);

    this.gestionPedidosService.obtenerPresupuestoPedidoClientesPage(idGrupo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (presupuesto) => {
          this.presupuestoGrupo.set(presupuesto);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los datos del colegio.' });
        },
      });
  }

}
