import { Component, inject, signal } from '@angular/core';
import { GestionPedidosService } from '../../../../services/gestionPedidos/gestion-pedidos-service';
import { presupuestoPedidoClientesPage } from '../../../../services/gestionPedidos/dto/PresupuestoPedidoClientePage.dto';
import { ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../shared/notifications/notification.service';

@Component({
  selector: 'app-presupuesto',
  imports: [],
  templateUrl: './presupuesto.html',
  styleUrl: './presupuesto.css',
})
export class Presupuesto 
{
  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly notificaciones = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  readonly presupuestoGrupo = signal<presupuestoPedidoClientesPage | null>(null);

  ngOnInit(): void
  {
    this.traerPresupuestoGrupo();
  }

  traerPresupuestoGrupo()
  {
    const idGrupo = Number(this.route.parent?.snapshot.paramMap.get('id'));

    this.gestionPedidosService.obtenerPresupuestoPedidoClientesPage(idGrupo)
      .subscribe({
        next: (presupuesto) => {
          this.presupuestoGrupo.set(presupuesto);
        },
        error: () => {
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los datos del colegio.' });
        },
      });
  }

}
