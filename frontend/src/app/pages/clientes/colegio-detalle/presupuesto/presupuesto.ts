import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { GestionPedidosService } from '../../../../services/gestionPedidos/gestion-pedidos-service';
import { presupuestoPedidoClientesPage } from '../../../../services/gestionPedidos/dto/PresupuestoPedidoClientePage.dto';
import { AgregadoGlobalPedidoResponseDTO } from '../../../../services/gestionPedidos/dto/AgregadoGlobalPedidoResponse.dto';
import { ProductoPedidoResponseConNombreOriginalDTO } from '../../../../services/productosPedidos/dto/ProductoPedidoResponse.dto';
import { ProductosService } from '../../../../services/productos/productos-service';
import { ProductoPreciosDTO } from '../../../../services/productos/dto/ProductoPrecios.dto';
import { AgregadoDBDTO } from '../../../../services/productos/dto/agregadoDB.dto';
import { GruposService } from '../../../../services/grupos/grupos-service';
import { ActivatedRoute } from '@angular/router';
import { NotificationService } from '../../../../shared/notifications/notification.service';

const SEPARADOR_AGREGADOS = ' · Agregado: ';

interface AgregadoConPrecio
{
  id: number;
  nombre: string;
  cuotaIndividual: number;
  cuotaGrupal: number;
}

interface ProductoPedidoConPrecios
{
  id: number;
  nombreProductoOriginal: string;
  descripcion: string | null;
  cantidad: number;
  valorSeniaIndividual: number;
  valorSeniaGrupal: number;
  valorCuotaIndividual: number;
  valorCuotaGrupal: number;
  agregados: AgregadoConPrecio[];
}

@Component({
  selector: 'app-presupuesto',
  imports: [CurrencyPipe],
  templateUrl: './presupuesto.html',
  styleUrl: './presupuesto.css',
})
export class Presupuesto implements OnInit
{
  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly productosService = inject(ProductosService);
  private readonly gruposService = inject(GruposService);
  private readonly notificaciones = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly presupuestoGrupo = signal<presupuestoPedidoClientesPage | null>(null);
  readonly productosConPrecios = signal<ProductoPedidoConPrecios[]>([]);
  readonly agregadosGlobalesConPrecios = signal<AgregadoConPrecio[]>([]);
  readonly cargando = signal(false);
  readonly cargandoPrecios = signal(false);
  readonly productosConAgregadosAbiertos = signal<ReadonlySet<number>>(new Set());

  readonly beneficioPedido = computed(() => this.presupuestoGrupo()?.productosPedido[0]?.beneficio || 'Sin beneficio');

  readonly totalSenia = computed(() =>
    this.productosConPrecios().reduce((total, producto) => total + producto.valorSeniaGrupal, 0),
  );

  readonly totalCuota = computed(() => {
    const productos = this.productosConPrecios().reduce(
      (total, producto) =>
        total + producto.valorCuotaGrupal + producto.agregados.reduce((totalAgregados, agregado) => totalAgregados + agregado.cuotaGrupal, 0),
      0,
    );
    const agregadosGlobales = this.agregadosGlobalesConPrecios().reduce((total, agregado) => total + agregado.cuotaGrupal, 0);
    return productos + agregadosGlobales;
  });

  readonly totalSeniaIndividual = computed(() =>
    this.productosConPrecios().reduce((total, producto) => total + producto.valorSeniaIndividual, 0),
  );

  readonly totalCuotaIndividual = computed(() => {
    const productos = this.productosConPrecios().reduce(
      (total, producto) =>
        total + producto.valorCuotaIndividual + producto.agregados.reduce((totalAgregados, agregado) => totalAgregados + agregado.cuotaIndividual, 0),
      0,
    );
    const agregadosGlobales = this.agregadosGlobalesConPrecios().reduce((total, agregado) => total + agregado.cuotaIndividual, 0);
    return productos + agregadosGlobales;
  });

  ngOnInit(): void
  {
    this.traerPresupuestoGrupo();
  }

  toggleAgregados(idProducto: number): void
  {
    this.productosConAgregadosAbiertos.update((abiertos) => {
      const nuevo = new Set(abiertos);
      if (nuevo.has(idProducto))
      {
        nuevo.delete(idProducto);
      }
      else
      {
        nuevo.add(idProducto);
      }
      return nuevo;
    });
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
          this.traerPreciosProductos(presupuesto, idGrupo);
        },
        error: () => {
          this.cargando.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los datos del colegio.' });
        },
      });
  }

  private traerPreciosProductos(presupuesto: presupuestoPedidoClientesPage, idGrupo: number): void
  {
    this.cargandoPrecios.set(true);

    const precios$ = presupuesto.productosPedido.length
      ? forkJoin(
          presupuesto.productosPedido.map((producto) =>
            this.productosService.obtenerPreciosProducto(producto.id_producto_original, presupuesto.nroCuotas, producto.cantidad),
          ),
        )
      : of([] as ProductoPreciosDTO[]);

    const agregadosDisponibles$ = this.productosService.obtenerAgregados();

    const cantidadEgresados$ = presupuesto.agregadosGlobales.length
      ? this.gruposService.obtenerCantidadEgresados(idGrupo)
      : of(0);

    forkJoin([precios$, agregadosDisponibles$, cantidadEgresados$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([precios, agregadosDisponibles, cantidadEgresados]) => {
          const agregadosIndividuales = agregadosDisponibles.filter((agregado) => agregado.individual);

          this.productosConPrecios.set(
            presupuesto.productosPedido.map((producto, indice) =>
              this.combinarProductoConPrecios(producto, precios[indice], presupuesto.nroCuotas, agregadosIndividuales),
            ),
          );

          this.agregadosGlobalesConPrecios.set(
            presupuesto.agregadosGlobales.map((agregado) =>
              this.combinarAgregadoGlobalConPrecios(agregado, presupuesto.nroCuotas, cantidadEgresados),
            ),
          );

          this.cargandoPrecios.set(false);
        },
        error: () => {
          this.cargandoPrecios.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los precios de los productos.' });
        },
      });
  }

  private combinarProductoConPrecios(
    producto: ProductoPedidoResponseConNombreOriginalDTO,
    precios: ProductoPreciosDTO,
    nroCuotas: number,
    agregadosIndividuales: AgregadoDBDTO[],
  ): ProductoPedidoConPrecios
  {
    const [descripcionBase, ...nombresAgregados] = (producto.descripcion ?? '').split(SEPARADOR_AGREGADOS);

    const agregados: AgregadoConPrecio[] = agregadosIndividuales
      .filter((agregado) => nombresAgregados.includes(agregado.agregado))
      .map((agregado) => ({
        id: agregado.id,
        nombre: agregado.agregado,
        cuotaIndividual: agregado.precio / nroCuotas,
        cuotaGrupal: (agregado.precio * producto.cantidad) / nroCuotas,
      }));

    return {
      id: producto.id,
      nombreProductoOriginal: producto.nombreProductoOriginal,
      descripcion: descripcionBase || null,
      cantidad: producto.cantidad,
      valorSeniaIndividual: precios.valor_senia,
      valorSeniaGrupal: precios.valor_senia * producto.cantidad,
      valorCuotaIndividual: precios.valor_cuota,
      valorCuotaGrupal: precios.valor_cuota * producto.cantidad,
      agregados,
    };
  }

  private combinarAgregadoGlobalConPrecios(
    agregado: AgregadoGlobalPedidoResponseDTO,
    nroCuotas: number,
    cantidadEgresados: number,
  ): AgregadoConPrecio
  {
    const precioGrupal = agregado.precio;
    const precioIndividual = cantidadEgresados > 0 ? precioGrupal / cantidadEgresados : 0;

    return {
      id: agregado.id,
      nombre: agregado.agregado,
      cuotaIndividual: precioIndividual / nroCuotas,
      cuotaGrupal: precioGrupal / nroCuotas,
    };
  }
}
