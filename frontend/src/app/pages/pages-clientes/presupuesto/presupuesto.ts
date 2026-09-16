import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { presupuestoPedidoClientesPage } from '../../../services/gestionPedidos/dto/PresupuestoPedidoClientePage.dto';
import { ClientesPortalService } from '../../../services/clientes-portal/clientes-portal-service';
import { NotificationService } from '../../../shared/notifications/notification.service';

interface ProductoPedidoConTotales
{
  id: number;
  nombreProductoOriginal: string;
  descripcion: string | null;
  cantidad: number;
  valorSeniaIndividual: number;
  valorSeniaGrupal: number;
  valorCuotaIndividual: number;
  valorCuotaGrupal: number;
}

interface AgregadoGlobalConCuota
{
  id: number;
  nombre: string;
  cuotaIndividual: number;
  cuotaGrupal: number;
}

@Component({
  selector: 'app-presupuesto',
  imports: [CurrencyPipe],
  templateUrl: './presupuesto.html',
  styleUrl: './presupuesto.css',
})
export class Presupuesto implements OnInit
{
  private readonly portalClienteService = inject(ClientesPortalService);
  private readonly notificaciones = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly presupuestoGrupo = signal<presupuestoPedidoClientesPage | null>(null);
  readonly cargando = signal(false);

  readonly beneficioPedido = computed(() => this.presupuestoGrupo()?.productosPedido[0]?.beneficio || 'Sin beneficio');

  // A diferencia de la versión staff (pages/clientes/colegio-detalle/presupuesto), acá no se
  // recalculan precios "en vivo" contra /productos (son endpoints de staff, con AuthGuard, a
  // los que un cliente logueado con cliente_token no tiene acceso). Se usan directamente los
  // valores ya guardados en cada línea de productos_pedidos (valor_senia/valor_cuota son por
  // unidad), que son los que realmente se le cobran al cliente.
  readonly productosConTotales = computed<ProductoPedidoConTotales[]>(() =>
    (this.presupuestoGrupo()?.productosPedido ?? []).map((producto) => ({
      id: producto.id,
      nombreProductoOriginal: producto.nombreProductoOriginal,
      descripcion: producto.descripcion || null,
      cantidad: producto.cantidad,
      valorSeniaIndividual: producto.valor_senia,
      valorSeniaGrupal: producto.valor_senia * producto.cantidad,
      valorCuotaIndividual: producto.valor_cuota,
      valorCuotaGrupal: producto.valor_cuota * producto.cantidad,
    })),
  );

  // Igual que combinarAgregadoGlobalConPrecios() en la versión staff: el precio grupal es
  // agregado.precio tal cual viene, y el individual reparte ese total entre cantidadEgresados.
  readonly agregadosGlobalesConCuota = computed<AgregadoGlobalConCuota[]>(() => {
    const presupuesto = this.presupuestoGrupo();
    if (!presupuesto) return [];

    const nroCuotas = presupuesto.nroCuotas || 1;
    const cantidadEgresados = presupuesto.cantidadEgresados;

    return presupuesto.agregadosGlobales.map((agregado) => {
      const precioIndividual = cantidadEgresados > 0 ? agregado.precio / cantidadEgresados : 0;
      return {
        id: agregado.id,
        nombre: agregado.agregado,
        cuotaIndividual: precioIndividual / nroCuotas,
        cuotaGrupal: agregado.precio / nroCuotas,
      };
    });
  });

  readonly totalSenia = computed(() =>
    this.productosConTotales().reduce((total, producto) => total + producto.valorSeniaGrupal, 0),
  );

  readonly totalCuota = computed(() => {
    const productos = this.productosConTotales().reduce((total, producto) => total + producto.valorCuotaGrupal, 0);
    const agregadosGlobales = this.agregadosGlobalesConCuota().reduce((total, agregado) => total + agregado.cuotaGrupal, 0);
    return productos + agregadosGlobales;
  });

  readonly totalSeniaIndividual = computed(() =>
    this.productosConTotales().reduce((total, producto) => total + producto.valorSeniaIndividual, 0),
  );

  readonly totalCuotaIndividual = computed(() => {
    const productos = this.productosConTotales().reduce((total, producto) => total + producto.valorCuotaIndividual, 0);
    const agregadosGlobales = this.agregadosGlobalesConCuota().reduce((total, agregado) => total + agregado.cuotaIndividual, 0);
    return productos + agregadosGlobales;
  });

  ngOnInit(): void
  {
    this.traerPresupuestoGrupo();
  }

  traerPresupuestoGrupo(): void
  {
    this.cargando.set(true);

    this.portalClienteService.obtenerPresupuesto()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (presupuesto) => {
          this.presupuestoGrupo.set(presupuesto);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudo obtener el presupuesto del pedido.' });
        },
      });
  }
}