import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { MovimientosCajaService } from '../../services/movimientosCaja/movimientos-caja-service';
import { MovimientoCajaResponseDTO } from '../../services/movimientosCaja/dto/movimientoCajaResponse.dto';
import { MovimientoCajaDTO } from '../../services/movimientosCaja/dto/movimientoCaja.dto copy';
import { UsuarioService } from '../../services/usuarios/usuario-service';
import { UsuarioResponse } from '../../services/usuarios/dto/usuarioResponse';
import { PagosService } from '../../services/pagos/pagos-service';
import { PedidosService } from '../../services/pedidos/pedidos-service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { ConfirmationService } from '../../services/confirmation/confirmation.service';
import { Usuario } from '../../../interfaces/usuario';

type TipoMovimiento = 'ingreso' | 'egreso';

interface PaginaMovimientos {
  movimientos: MovimientoCajaResponseDTO[];
  pagina: number;
  hayMasPaginas: boolean;
}

interface FormularioMovimiento {
  fecha: string;
  monto: number | null;
  tipo: TipoMovimiento;
  categoria: string;
  categoriaOtro: string;
  descripcion: string;
}

const CATEGORIAS_EGRESO = ['Sueldos', 'Proveedores', 'Envíos', 'Alquileres', 'Gastos Oficina', 'Gastos Fábrica', 'Retiro de caja', 'Otros'];
const CATEGORIAS_INGRESO = ['Ingreso en efectivo', 'Otros'];

@Component({
  selector: 'app-movimientos-caja',
  imports: [FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './movimientos-caja.html',
  styleUrl: './movimientos-caja.css',
})
export class MovimientosCaja implements OnInit
{
  private readonly movimientosCajaService = inject(MovimientosCajaService);
  private readonly pagosService = inject(PagosService);
  private readonly pedidosService = inject(PedidosService);
  private readonly usuariosService = inject(UsuarioService);
  private readonly notificaciones = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly TAMANIO_PAGINA = 10;

  private readonly paginaVacia: PaginaMovimientos = { movimientos: [], pagina: 0, hayMasPaginas: false };
  readonly datosPagina = signal<PaginaMovimientos>({ ...this.paginaVacia });
  readonly cargando = signal(false);
  readonly movimientosVisibles = computed(() => this.datosPagina().movimientos);

  private readonly solicitudPagina$ = new Subject<number>();
  private readonly busquedaCambiada$ = new Subject<string>();

  readonly busqueda = signal('');
  readonly busquedaInput = signal('');
  readonly tipoFiltro = signal<'' | TipoMovimiento>('');
  readonly categoriaFiltro = signal('');

  readonly categoriasFiltro = computed(() => {
    if (this.tipoFiltro() === 'ingreso') return CATEGORIAS_INGRESO;
    if (this.tipoFiltro() === 'egreso') return CATEGORIAS_EGRESO;
    return [...CATEGORIAS_INGRESO, ...CATEGORIAS_EGRESO.filter((categoria) => !CATEGORIAS_INGRESO.includes(categoria))];
  });

  private readonly usuariosCache = signal<Record<number, UsuarioResponse>>({});
  private readonly vendedoraPorPedido = signal<Record<number, number>>({});

  readonly totalIngresosCaja = signal<number | null>(null);
  readonly totalIngresosEfectivo = signal<number | null>(null);
  readonly totalEgresos = signal<number | null>(null);
  readonly cargandoTotales = signal(false);

  readonly dineroEnCaja = computed(() => {
    const ingresosCaja = this.totalIngresosCaja();
    const ingresosEfectivo = this.totalIngresosEfectivo();
    const egresos = this.totalEgresos();
    if (ingresosCaja === null || ingresosEfectivo === null || egresos === null) return null;
    return ingresosCaja + ingresosEfectivo - egresos;
  });

  readonly vistaFormulario = signal(false);
  readonly guardando = signal(false);
  readonly modoFormulario = signal<'agregar' | 'editar'>('agregar');
  formularioMovimiento: FormularioMovimiento = this.crearFormularioVacio();
  private movimientoEditando: MovimientoCajaResponseDTO | null = null;

  categoriasFormulario(): string[]
  {
    return this.formularioMovimiento.tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;
  }

  ngOnInit(): void
  {
    this.inicializarPipelineMovimientos();
    this.inicializarBusquedaConDebounce();
    this.cargarMovimientos();
    this.cargarTotales();
  }

  private crearFormularioVacio(): FormularioMovimiento
  {
    return {
      fecha: new Date().toISOString().slice(0, 10),
      monto: null,
      tipo: 'ingreso',
      categoria: '',
      categoriaOtro: '',
      descripcion: '',
    };
  }

  private inicializarPipelineMovimientos(): void
  {
    this.solicitudPagina$
      .pipe(
        switchMap((pagina) => {
          this.cargando.set(true);
          const desde = pagina * this.TAMANIO_PAGINA;
          const hasta = desde + this.TAMANIO_PAGINA - 1;
          const busqueda = this.busqueda().trim() || undefined;
          const tipo = this.tipoFiltro() || undefined;
          const categoria = this.categoriaFiltro() || undefined;

          return this.movimientosCajaService.obtenerMovimientos(desde, hasta, busqueda, tipo, categoria).pipe(
            map((movimientos) => ({ pagina, movimientos })),
            catchError(() => {
              this.cargando.set(false);
              this.notificaciones.error({ title: 'Error al cargar movimientos', description: 'No se pudieron obtener los movimientos de caja.' });
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        if (!resultado) return;
        const { pagina, movimientos } = resultado;

        if (movimientos.length === 0 && pagina > 0)
        {
          this.datosPagina.update((actual) => ({ ...actual, hayMasPaginas: false }));
        }
        else
        {
          this.datosPagina.set({ movimientos, pagina, hayMasPaginas: movimientos.length === this.TAMANIO_PAGINA });
          movimientos.forEach((movimiento) => {
            if (movimiento.usuario !== null)
            {
              this.cargarUsuarioSiFalta(movimiento.usuario);
            }
            else if (movimiento.id_pedido !== null)
            {
              this.cargarVendedoraSiFalta(movimiento.id_pedido);
            }
          });
        }

        this.cargando.set(false);
      });
  }

  private inicializarBusquedaConDebounce(): void
  {
    this.busquedaCambiada$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((valor) => {
        this.busqueda.set(valor.trim());
        this.cargarMovimientos();
      });
  }

  actualizarBusqueda(valor: string): void
  {
    this.busquedaInput.set(valor);
    this.busquedaCambiada$.next(valor);
  }

  cargarMovimientos(): void
  {
    this.solicitudPagina$.next(0);
  }

  filtrarPorTipo(tipo: '' | TipoMovimiento): void
  {
    this.tipoFiltro.set(tipo);
    this.categoriaFiltro.set('');
    this.cargarMovimientos();
  }

  filtrarPorCategoria(categoria: string): void
  {
    this.categoriaFiltro.set(categoria);
    this.cargarMovimientos();
  }

  paginaAnterior(): void
  {
    const actual = this.datosPagina();
    if (actual.pagina === 0) return;
    this.solicitudPagina$.next(actual.pagina - 1);
  }

  paginaSiguiente(): void
  {
    const actual = this.datosPagina();
    if (!actual.hayMasPaginas) return;
    this.solicitudPagina$.next(actual.pagina + 1);
  }

  private cargarUsuarioSiFalta(idUsuario: number): void
  {
    if (this.usuariosCache()[idUsuario]) return;

    this.traerUsuarioPorId(idUsuario)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (usuario) => this.usuariosCache.update((actual) => ({ ...actual, [idUsuario]: usuario })),
        error: () => {},
      });
  }

  traerUsuarioPorId(id: number)
  {
    return this.usuariosService.traerUsuarioPorId(id);
  }

  private cargarVendedoraSiFalta(idPedido: number): void
  {
    if (this.vendedoraPorPedido()[idPedido] !== undefined) return;

    this.pedidosService.obtenerIdVendedora(idPedido)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (idVendedora) => {
          this.vendedoraPorPedido.update((actual) => ({ ...actual, [idPedido]: idVendedora }));
          this.cargarUsuarioSiFalta(idVendedora);
        },
        error: () => {
          this.vendedoraPorPedido.update((actual) => ({ ...actual, [idPedido]: -1 }));
        },
      });
  }

  nombreUsuario(movimiento: MovimientoCajaResponseDTO): string
  {
    if (movimiento.usuario !== null)
    {
      const usuario = this.usuariosCache()[movimiento.usuario];
      return usuario ? `${usuario.nombre} ${usuario.apellido}` : '…';
    }

    if (movimiento.id_pedido === null) return 'Vendedora';

    const idVendedora = this.vendedoraPorPedido()[movimiento.id_pedido];
    if (idVendedora === undefined) return '…';
    if (idVendedora === -1) return 'Vendedora';

    const usuario = this.usuariosCache()[idVendedora];
    return usuario ? `${usuario.nombre} ${usuario.apellido}` : '…';
  }

  cargarTotales(): void
  {
    this.cargandoTotales.set(true);

    forkJoin({
      ingresosCaja: this.traerTotalIngresos(),
      ingresosEfectivo: this.pagosService.traerTotalIngresosEfectivos(),
      egresos: this.traerTotalEgresos(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ ingresosCaja, ingresosEfectivo, egresos }) => {
          this.totalIngresosCaja.set(ingresosCaja);
          this.totalIngresosEfectivo.set(ingresosEfectivo);
          this.totalEgresos.set(egresos);
          this.cargandoTotales.set(false);
        },
        error: () => {
          this.cargandoTotales.set(false);
          this.notificaciones.error({ title: 'Error', description: 'No se pudo obtener el dinero en caja.' });
        },
      });
  }

  traerTotalIngresos()
  {
    return this.movimientosCajaService.obtenerTotalIngresos();
  }

  traerTotalEgresos()
  {
    return this.movimientosCajaService.obtenerTotalEgresos();
  }

  abrirFormulario(): void
  {
    this.formularioMovimiento = this.crearFormularioVacio();
    this.modoFormulario.set('agregar');
    this.movimientoEditando = null;
    this.vistaFormulario.set(true);
  }

  abrirFormularioEdicion(movimiento: MovimientoCajaResponseDTO): void
  {
    const tipo = movimiento.tipo as TipoMovimiento;
    const categoriasValidas = tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;
    const categoriaConocida = categoriasValidas.includes(movimiento.categoria);

    this.formularioMovimiento = {
      fecha: new Date(movimiento.fecha).toISOString().slice(0, 10),
      monto: movimiento.monto,
      tipo,
      categoria: categoriaConocida ? movimiento.categoria : 'Otros',
      categoriaOtro: categoriaConocida ? '' : movimiento.categoria,
      descripcion: movimiento.descripcion,
    };

    this.modoFormulario.set('editar');
    this.movimientoEditando = movimiento;
    this.vistaFormulario.set(true);
  }

  cerrarFormulario(): void
  {
    this.vistaFormulario.set(false);
    this.movimientoEditando = null;
  }

  cambiarTipoFormulario(tipo: TipoMovimiento): void
  {
    this.formularioMovimiento.tipo = tipo;
    this.formularioMovimiento.categoria = '';
    this.formularioMovimiento.categoriaOtro = '';
  }

  guardarFormulario(): void
  {
    if (this.modoFormulario() === 'editar')
    {
      this.modificarMovimiento();
    }
    else
    {
      this.agregarMovimiento();
    }
  }

  private construirDtoDesdeFormulario(): MovimientoCajaDTO | null
  {
    const formulario = this.formularioMovimiento;

    if (!formulario.fecha)
    {
      this.notificaciones.error({ title: 'Falta la fecha', description: 'Ingresá la fecha del movimiento.' });
      return null;
    }

    if (!formulario.monto || formulario.monto <= 0)
    {
      this.notificaciones.error({ title: 'Monto inválido', description: 'Ingresá un monto mayor a 0.' });
      return null;
    }

    const categoriaElegida = formulario.categoria === 'Otros' ? formulario.categoriaOtro.trim() : formulario.categoria;

    if (!categoriaElegida)
    {
      this.notificaciones.error({ title: 'Falta la categoría', description: 'Seleccioná o ingresá una categoría.' });
      return null;
    }

    const usuario = this.obtenerUsuario();

    if (!usuario)
    {
      this.notificaciones.warning({ title: 'Sesión no encontrada', description: 'No se encontró la sesión del usuario. Volvé a iniciar sesión.' });
      return null;
    }

    return {
      fecha: new Date(formulario.fecha),
      monto: formulario.monto,
      categoria: this.capitalizar(categoriaElegida),
      descripcion: formulario.descripcion.trim(),
      usuario: usuario.id,
      tipo: formulario.tipo,
    };
  }

  agregarMovimiento(): void
  {
    const dto = this.construirDtoDesdeFormulario();
    if (!dto) return;

    this.guardando.set(true);

    this.movimientosCajaService.agregarMovimiento(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.notificaciones.success({ title: 'Movimiento agregado', description: 'El movimiento se registró correctamente.' });
          this.cerrarFormulario();
          this.cargarMovimientos();
          this.cargarTotales();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.notificarErrorGuardado(err);
        },
      });
  }

  async eliminarMovimiento(movimiento: MovimientoCajaResponseDTO): Promise<void>
  {
    const idNumero = Number(movimiento.id.split('-')[1]);

    const confirmado = await this.confirmationService.confirm({
      title: 'Eliminar movimiento',
      description: '¿Está seguro de que desea eliminar este movimiento de caja?',
    });

    if (!confirmado) return;

    if(movimiento.origen == 'movimientos_caja')
    {
        this.movimientosCajaService.eliminarMovimiento(idNumero)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.notificaciones.success({ title: 'Movimiento eliminado', description: 'El movimiento se eliminó correctamente.' });
            this.cargarMovimientos();
            this.cargarTotales();
          },
          error: () => {
            this.notificaciones.error({ title: 'Error', description: 'No se pudo eliminar el movimiento.' });
          },
        });
    }
    else if(movimiento.origen == 'pagos')
    {
        this.pagosService.eliminarPago(idNumero)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.notificaciones.success({ title: 'Movimiento eliminado', description: 'El movimiento se eliminó correctamente.' });
            this.cargarMovimientos();
            this.cargarTotales();
          },
          error: () => {
            this.notificaciones.error({ title: 'Error', description: 'No se pudo eliminar el movimiento.' });
          },
        });
    }
  }


  modificarMovimiento(): void
  {
    if (!this.movimientoEditando) return;

    const dto = this.construirDtoDesdeFormulario();
    if (!dto) return;

    const idNumero = Number(this.movimientoEditando.id.split('-')[1]);

    this.guardando.set(true);

    this.movimientosCajaService.modificarMovimiento(idNumero, dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.notificaciones.success({ title: 'Movimiento modificado', description: 'El movimiento se modificó correctamente.' });
          this.cerrarFormulario();
          this.cargarMovimientos();
          this.cargarTotales();
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.notificarErrorGuardado(err);
        },
      });
  }

  private capitalizar(texto: string): string
  {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  private obtenerUsuario(): Usuario | null
  {
    try
    {
      const guardado = localStorage.getItem('usuario');
      return guardado ? (JSON.parse(guardado) as Usuario) : null;
    }
    catch
    {
      return null;
    }
  }

  private notificarErrorGuardado(err: HttpErrorResponse): void
  {
    const mensajeBackend: string = err?.error?.message ?? '';

    if (err.status === 0)
    {
      this.notificaciones.error({ title: 'Sin conexión', description: 'No se pudo conectar con el servidor. Verificá tu conexión a internet.' });
      return;
    }

    if (err.status === 401 || err.status === 403)
    {
      this.notificaciones.error({ title: 'Sesión no válida', description: 'No tenés permisos o tu sesión expiró. Volvé a iniciar sesión.' });
      return;
    }

    if (/duplicate key|unique constraint/i.test(mensajeBackend))
    {
      this.notificaciones.error({ title: 'Registro duplicado', description: 'Ya existe un registro con esos datos.' });
      return;
    }

    if (/null value.*not-null constraint/i.test(mensajeBackend))
    {
      this.notificaciones.error({ title: 'Faltan datos', description: 'Falta completar un campo obligatorio. Revisá el formulario e intentá nuevamente.' });
      return;
    }

    if (/invalid input syntax for type (date|timestamp)/i.test(mensajeBackend))
    {
      this.notificaciones.error({ title: 'Fecha inválida', description: 'La fecha ingresada no es válida.' });
      return;
    }

    if (/invalid input syntax/i.test(mensajeBackend))
    {
      this.notificaciones.error({ title: 'Datos inválidos', description: 'Uno de los datos ingresados no tiene un formato válido.' });
      return;
    }

    if (err.status >= 500)
    {
      this.notificaciones.error({ title: 'Error del servidor', description: 'Ocurrió un error inesperado en el servidor. Intentá nuevamente más tarde.' });
      return;
    }

    this.notificaciones.error({ title: 'Error al guardar', description: mensajeBackend || 'No se pudo guardar el movimiento.' });
  }
}
