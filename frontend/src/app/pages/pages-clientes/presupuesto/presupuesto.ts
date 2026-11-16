import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { presupuestoPedidoClientesPage } from '../../../services/gestionPedidos/dto/PresupuestoPedidoClientePage.dto';
import { ClientesPortalService } from '../../../services/clientes-portal/clientes-portal-service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { cantidadSinCargo, formatearBeneficios } from '../../../services/gestionPedidos/dto/BeneficioPedido.dto';
import { CuotaParaMostrar, cuotasParaMostrar, descuentoHermanos, cuotasTodasIguales, etiquetaPlan, parteAgregadoGlobal } from '../../../services/cuotas/plan-cuotas';

interface ProductoPedidoConTotales
{
  id: number;
  sinCargo: number;
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
  // En cuotas iguales la bandera también va en la seña (la seña es la cuota 1)
  seniaIndividual: number;
  seniaGrupal: number;
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

  // Cuotas reales del pedido (lo que se cobra): pueden no coincidir con el precio de lista del plan,
  // por ejemplo si la seña quedó fija al cambiar de plan o se pagaron cuotas antes de un cambio
  readonly cuotasReales = signal<CuotaParaMostrar[]>([]);
  readonly cuotasRealesIguales = computed(() => cuotasTodasIguales(this.cuotasReales()));

  readonly cargando = signal(false);

  readonly beneficioPedido = computed(() => formatearBeneficios(this.presupuestoGrupo()?.beneficios));

  // A diferencia de la versión staff (pages/clientes/colegio-detalle/presupuesto), acá no se
  // recalculan precios "en vivo" contra /productos (son endpoints de staff, con AuthGuard, a
  // los que un cliente logueado con cliente_token no tiene acceso). Se usan directamente los
  // valores ya guardados en cada línea de productos_pedidos (valor_senia/valor_cuota son por
  // unidad), que son los que realmente se le cobran al cliente.
  readonly productosConTotales = computed<ProductoPedidoConTotales[]>(() =>
    (this.presupuestoGrupo()?.productosPedido ?? []).map((producto) => ({
      id: producto.id,
      sinCargo: cantidadSinCargo(this.presupuestoGrupo()?.beneficios, producto.id_producto_original),
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
    const conSenia = presupuesto.pedido.con_senia;
    const cantidadEgresados = presupuesto.cantidadEgresados;

    // Con seña se reparte en las cuotas; en cuotas iguales, entre la seña y las cuotas
    return presupuesto.agregadosGlobales.map((agregado) => {
      const precioIndividual = cantidadEgresados > 0 ? Number(agregado.precio) / cantidadEgresados : 0;
      const grupal = parteAgregadoGlobal(Number(agregado.precio), nroCuotas, conSenia);
      const individual = parteAgregadoGlobal(precioIndividual, nroCuotas, conSenia);
      return {
        id: agregado.id,
        nombre: agregado.agregado,
        cuotaIndividual: individual.cuota,
        cuotaGrupal: grupal.cuota,
        seniaIndividual: individual.senia,
        seniaGrupal: grupal.senia,
      };
    });
  });

  readonly totalSenia = computed(() =>
    this.productosConTotales().reduce((total, producto) => total + producto.valorSeniaGrupal, 0)
    + this.agregadosGlobalesConCuota().reduce((total, agregado) => total + agregado.seniaGrupal, 0),
  );

  // Seña acordada: queda fija desde la primera modificación del plan (aunque cambien los productos)
  readonly seniaAcordada = computed(() => this.presupuestoGrupo()?.pedido.senia_total ?? this.totalSeniaFinal());

  readonly totalCuota = computed(() => {
    const productos = this.productosConTotales().reduce((total, producto) => total + producto.valorCuotaGrupal, 0);
    const agregadosGlobales = this.agregadosGlobalesConCuota().reduce((total, agregado) => total + agregado.cuotaGrupal, 0);
    return productos + agregadosGlobales;
  });

  readonly totalSeniaIndividual = computed(() =>
    this.productosConTotales().reduce((total, producto) => total + producto.valorSeniaIndividual, 0)
    + this.agregadosGlobalesConCuota().reduce((total, agregado) => total + agregado.seniaIndividual, 0),
  );

  readonly totalCuotaIndividual = computed(() => {
    const productos = this.productosConTotales().reduce((total, producto) => total + producto.valorCuotaIndividual, 0);
    const agregadosGlobales = this.agregadosGlobalesConCuota().reduce((total, agregado) => total + agregado.cuotaIndividual, 0);
    return productos + agregadosGlobales;
  });

  // Descuento por hermanos: cada hermano tiene el % sobre lo que paga un egresado (total grupal sin bandera /
  // cantidad de egresados), en la cuota y en la seña. Mismo criterio que Ventas y el recálculo por talles.
  private descuentoSobre(totalSinBandera: number): number
  {
    const presupuesto = this.presupuestoGrupo();
    if (!presupuesto) return 0;
    return descuentoHermanos(totalSinBandera, presupuesto.cantidadEgresados, Number(presupuesto.pedido.porcentaje_descuento_hermanos), Number(presupuesto.pedido.cantidad_hermanos));
  }

  private readonly hermanos = computed(() => Number(this.presupuestoGrupo()?.pedido.cantidad_hermanos) || 0);

  readonly descuentoHermanos = computed(() =>
    this.descuentoSobre(this.totalCuota() - this.agregadosGlobalesConCuota().reduce((total, agregado) => total + agregado.cuotaGrupal, 0)));
  readonly descuentoHermanosSenia = computed(() =>
    this.descuentoSobre(this.totalSenia() - this.agregadosGlobalesConCuota().reduce((total, agregado) => total + agregado.seniaGrupal, 0)));
  // Lo que se le descuenta a cada hermano (el total individual no cambia: el resto de los egresados paga completo)
  readonly descuentoHermanosIndividual = computed(() => this.hermanos() ? this.descuentoHermanos() / this.hermanos() : 0);
  readonly descuentoHermanosSeniaIndividual = computed(() => this.hermanos() ? this.descuentoHermanosSenia() / this.hermanos() : 0);
  readonly totalCuotaFinal = computed(() => this.totalCuota() - this.descuentoHermanos());
  readonly totalSeniaFinal = computed(() => this.totalSenia() - this.descuentoHermanosSenia());

  readonly etiquetaPlanCuotas = computed(() => {
    const presupuesto = this.presupuestoGrupo();
    if (!presupuesto) return '';

    return etiquetaPlan(presupuesto.nroCuotas, presupuesto.pedido.con_senia);
  });

  ngOnInit(): void
  {
    this.traerPresupuestoGrupo();
  }

  private traerCuotasReales(conSenia: boolean): void
  {
    this.portalClienteService.obtenerCuotas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cuotas) => this.cuotasReales.set(cuotasParaMostrar(cuotas, conSenia)),
        error: () => this.cuotasReales.set([]),
      });
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
          this.traerCuotasReales(presupuesto.pedido.con_senia);
        },
        error: () => {
          this.cargando.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudo obtener el presupuesto del pedido.' });
        },
      });
  }
}