import { Component, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ClientesPortalService } from '../../../../services/clientes-portal/clientes-portal-service';
import { NotificationService } from '../../../../shared/notifications/notification.service';
import { productosPedidoIdNombreDTO } from '../../../../services/productosPedidos/dto/ProductoPedidoIdNombre.dto';
import { PrendaPedidoDTO } from '../../../../services/clientes-portal/dto/prenda.dto';
import { ConfirmationService } from '../../../../services/confirmation/confirmation.service';
import { FirmaComponent } from '../../../../firma/firma';
import { TallesConfirmacionService } from '../talles-confirmacion.service';

const ID_PANTALON = 72;
const ID_BANDERA = 73;
const IDS_CAMPERA_BUZO = [63, 64, 71];

const TALLES_CAMPERA_BUZO_SECUNDARIA = ['XS', 'S', 'M', 'M ESP.', 'L', 'XL', 'XXL', 'XXXL'];
const TALLES_CAMPERA_BUZO_PRIMARIA = ['10', '12', '14', '16', '18', 'L', 'XL'];
const TALLES_REMERA_CHOMBA_SECUNDARIA = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const TALLES_REMERA_CHOMBA_PRIMARIA = ['10', '12', '14', '16', '18', 'L', 'XL'];
const TALLES_PANTALON = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Largo máximo de cada inscripción (nombre o apodo) bordada
export const LARGO_MAXIMO_NOMBRE = 10;


function tallesDelProducto(idProducto: number, secundaria: boolean): string[]
{
    if (idProducto === ID_PANTALON)
    {
        return TALLES_PANTALON;
    }

    if (IDS_CAMPERA_BUZO.includes(idProducto))
    {
        return secundaria ? TALLES_CAMPERA_BUZO_SECUNDARIA : TALLES_CAMPERA_BUZO_PRIMARIA;
    }

    return secundaria ? TALLES_REMERA_CHOMBA_SECUNDARIA : TALLES_REMERA_CHOMBA_PRIMARIA;
}

interface ProductoConTalles
{
    idProductoOriginal: number;
    nombreProducto: string;
    esPantalon: boolean;
    talles: string[];
}

interface TotalProducto
{
    idProductoOriginal: number;
    nombreProducto: string;
    total: number;
}

@Component({
  selector: 'app-carga',
  imports: [FirmaComponent],
  templateUrl: './carga.html',
  styleUrl: './carga.css',
})
export class Carga implements OnInit, OnDestroy
{
    private readonly clientesPortalService = inject(ClientesPortalService);
    private readonly notificaciones = inject(NotificationService);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly tallesConfirmacion = inject(TallesConfirmacionService);

    private readonly firma = viewChild(FirmaComponent);

    readonly cargando = signal(true);
    readonly guardando = signal(false);

    readonly generandoResumen = signal(false);
    readonly vistaResumen = signal(false);
    readonly urlResumenSegura = signal<SafeResourceUrl | null>(null);
    private urlResumenBlob: string | null = null;

    readonly confirmando = signal(false);
    readonly firmaFaltante = signal(false);

    // Edición excepcional habilitada por administración: en vez de firmar se guarda definitivo
    readonly modoEdicion = this.tallesConfirmacion.edicionHabilitada;

    private readonly idPedido = signal<number | null>(null);
    private readonly secundaria = signal(false);
    private readonly productos = signal<productosPedidoIdNombreDTO[]>([]);

    // Pantalón: cantidad escrita.
    readonly valores = signal<Record<string, string>>({});

    // Resto de prendas: un casillero ("ranura") por prenda con su nombre; vacío = prenda sin nombre.
    // Normalmente hay tantos casilleros como la cantidad elegida; si hay más nombres que la cantidad,
    // los que sobran quedan marcados en rojo (ver ajustarRanuras).
    readonly nombres = signal<Record<string, string[]>>({});
    readonly largoMaximoNombre = LARGO_MAXIMO_NOMBRE;

    // Cantidad total elegida por talle (solo prendas que no son pantalón).
    readonly cantidades = signal<Record<string, string>>({});

    readonly productosConTalles = computed<ProductoConTalles[]>(() =>
    {
        const secundaria = this.secundaria();

        return this.productos()
            .filter(producto => producto.idProductoOriginal !== ID_BANDERA)
            .map(producto => ({
                idProductoOriginal: producto.idProductoOriginal,
                nombreProducto: producto.nombreProducto,
                esPantalon: producto.idProductoOriginal === ID_PANTALON,
                talles: tallesDelProducto(producto.idProductoOriginal, secundaria),
            }));
    });

    readonly totalesPorProducto = computed<TotalProducto[]>(() =>
        this.productosConTalles().map(producto => ({
            idProductoOriginal: producto.idProductoOriginal,
            nombreProducto: producto.nombreProducto,
            total: producto.talles.reduce((suma, talle) =>
            {
                const clave = this.clave(producto.idProductoOriginal, talle);
                return suma + (producto.esPantalon ? this.aEntero(this.valor(clave)) : this.cantidadSeleccionada(clave));
            }, 0),
        }))
    );

    async ngOnInit()
    {
        try
        {
            const [idPedido, secundaria, productos, prendas] = await Promise.all([
                firstValueFrom(this.clientesPortalService.obtenerIdPedido()),
                firstValueFrom(this.clientesPortalService.determinarSecundaria()),
                firstValueFrom(this.clientesPortalService.obtenerProductosPedidosComponentes()),
                firstValueFrom(this.clientesPortalService.obtenerPrendasPedido()),
            ]);

            this.idPedido.set(idPedido);
            this.secundaria.set(secundaria);
            this.productos.set(productos);
            const { valores, cantidades, nombres } = this.reconstruirValores(prendas);
            this.valores.set(valores);
            this.cantidades.set(cantidades);
            this.nombres.set(nombres);
        }
        catch
        {
            this.notificaciones.error({
                title: 'No se pudieron cargar los talles',
                description: 'Recargá la página o intentá más tarde.',
            });
        }
        finally
        {
            this.cargando.set(false);
        }
    }

    private reconstruirValores(prendas: PrendaPedidoDTO[]): { valores: Record<string, string>; cantidades: Record<string, string>; nombres: Record<string, string[]> }
    {
        const porClave = new Map<string, PrendaPedidoDTO[]>();

        for (const prenda of prendas)
        {
            const clave = this.clave(prenda.id_producto, prenda.talle);
            const lista = porClave.get(clave) ?? [];
            lista.push(prenda);
            porClave.set(clave, lista);
        }

        const valores: Record<string, string> = {};
        const cantidades: Record<string, string> = {};
        const nombres: Record<string, string[]> = {};

        for (const [clave, lista] of porClave)
        {
            const esPantalon = lista[0].id_producto === ID_PANTALON;

            if (esPantalon)
            {
                valores[clave] = String(lista.length);
            }
            else
            {
                // Cada fila guardada es una prenda (con o sin inscripción): primero los nombres, después los vacíos
                cantidades[clave] = String(lista.length);
                const conNombre = lista
                    .filter(prenda => prenda.inscripcion)
                    .map(prenda => prenda.inscripcion as string);
                nombres[clave] = this.ajustarRanuras(conNombre, lista.length);
            }
        }

        return { valores, cantidades, nombres };
    }

    private aEntero(valor: string): number
    {
        return Math.max(0, Math.trunc(Number(valor)) || 0);
    }

    clave(idProducto: number, talle: string): string
    {
      return `${idProducto}__${talle}`;
    }

    valor(clave: string): string
    {
      return this.valores()[clave] ?? '';
    }

    ranuras(clave: string): string[]
    {
        return this.nombres()[clave] ?? [];
    }

    private nombresCargados(clave: string): string[]
    {
        return this.ranuras(clave).map(nombre => nombre.trim()).filter(nombre => nombre.length > 0);
    }

    cantidadNombres(clave: string): number
    {
        return this.nombresCargados(clave).length;
    }

    // Casillero de más (hay más nombres que la cantidad elegida): se muestra en rojo
    esRanuraExcedida(clave: string, indice: number): boolean
    {
        return indice >= this.cantidadSeleccionada(clave);
    }

    // Deja tantos casilleros como la cantidad. Si sobran, se sacan primero los vacíos (desde el final);
    // si aun así hay más nombres que la cantidad, quedan todos (no se pierde ningún nombre) y se marca el error.
    private ajustarRanuras(nombres: string[], cantidad: number): string[]
    {
        const resultado = [...nombres];

        for (let i = resultado.length - 1; i >= 0 && resultado.length > cantidad; i--)
        {
            if (!resultado[i].trim())
            {
                resultado.splice(i, 1);
            }
        }

        while (resultado.length < cantidad)
        {
            resultado.push('');
        }

        return resultado;
    }

    cantidadInput(clave: string): string
    {
        return this.cantidades()[clave] ?? '';
    }

    cantidadSeleccionada(clave: string): number
    {
        return this.aEntero(this.cantidadInput(clave));
    }

    cantidadSinInscripcion(clave: string): number
    {
        return Math.max(0, this.cantidadSeleccionada(clave) - this.cantidadNombres(clave));
    }

    excedeCantidad(clave: string): boolean
    {
        return this.cantidadNombres(clave) > this.cantidadSeleccionada(clave);
    }

    onInputCantidadTotal(event: Event, clave: string)
    {
        const valor = (event.target as HTMLInputElement).value;
        this.cantidades.update(actual => ({ ...actual, [clave]: valor }));
        this.nombres.update(actual => ({ ...actual, [clave]: this.ajustarRanuras(actual[clave] ?? [], this.aEntero(valor)) }));
    }

    // Para el bordado: mayúsculas y los espacios pasan a ser puntos ("profe clau" → "PROFE.CLAU")
    onInputNombre(event: Event, clave: string, indice: number)
    {
        const input = event.target as HTMLInputElement;
        const posicion = input.selectionStart;
        const nombre = input.value.replace(/\s/g, '.').toUpperCase().slice(0, LARGO_MAXIMO_NOMBRE);

        if (input.value !== nombre)
        {
            input.value = nombre;
            if (posicion !== null) input.setSelectionRange(posicion, posicion);
        }

        this.nombres.update(actual =>
        {
            const ranuras = [...(actual[clave] ?? [])];
            ranuras[indice] = nombre;
            // Si se vació un casillero de más, desaparece
            return { ...actual, [clave]: this.ajustarRanuras(ranuras, this.cantidadSeleccionada(clave)) };
        });
    }

    actualizarValor(clave: string, valor: string)
    {
        this.valores.update(actual => ({ ...actual, [clave]: valor }));
    }

    onInputCantidad(event: Event, clave: string)
    {
        this.actualizarValor(clave, (event.target as HTMLInputElement).value);
    }

    private construirPrendasActuales(): PrendaPedidoDTO[]
    {
		const idPedido = this.idPedido();

		if (idPedido === null)
		{
			return [];
		}

		const prendas: PrendaPedidoDTO[] = [];

		for (const producto of this.productosConTalles())
		{
			for (const talle of producto.talles)
			{
				const clave = this.clave(producto.idProductoOriginal, talle);
				const valor = this.valor(clave);

				if (producto.esPantalon)
				{
					const cantidad = this.aEntero(valor);

					for (let i = 0; i < cantidad; i++)
					{
						prendas.push({ id_pedido: idPedido, id_producto: producto.idProductoOriginal, talle, inscripcion: null });
					}
				}
				else
				{
					for (const nombre of this.nombresCargados(clave))
					{
						prendas.push({ id_pedido: idPedido, id_producto: producto.idProductoOriginal, talle, inscripcion: nombre.toUpperCase() });
					}

					// El resto de la cantidad elegida son prendas sin inscripción
					const sinInscripcion = this.cantidadSinInscripcion(clave);

					for (let i = 0; i < sinInscripcion; i++)
					{
						prendas.push({ id_pedido: idPedido, id_producto: producto.idProductoOriginal, talle, inscripcion: null });
					}
				}
			}
		}

		return prendas;
	}

    // Nombres cargados antes de que existiera el límite (el input ya no deja escribir más)
    private primerNombreLargo(): { producto: string; talle: string; nombre: string } | null
    {
        for (const producto of this.productosConTalles())
        {
            if (producto.esPantalon) continue;

            for (const talle of producto.talles)
            {
                const nombre = this.nombresCargados(this.clave(producto.idProductoOriginal, talle))
                    .find(n => n.length > LARGO_MAXIMO_NOMBRE);

                if (nombre) return { producto: producto.nombreProducto, talle, nombre };
            }
        }

        return null;
    }

    nombreLargo(nombre: string): boolean
    {
        return nombre.trim().length > LARGO_MAXIMO_NOMBRE;
    }

    private primerTalleExcedido(): { producto: string; talle: string } | null
    {
        for (const producto of this.productosConTalles())
        {
            if (producto.esPantalon)
            {
                continue;
            }

            for (const talle of producto.talles)
            {
                if (this.excedeCantidad(this.clave(producto.idProductoOriginal, talle)))
                {
                    return { producto: producto.nombreProducto, talle };
                }
            }
        }

        return null;
    }

    async guardarProgreso(): Promise<boolean>
    {
		const idPedido = this.idPedido();

		if (this.guardando() || idPedido === null)
		{
			return false;
		}

		const excedido = this.primerTalleExcedido();

		if (excedido)
		{
			this.notificaciones.error({
				title: 'Hay más nombres que prendas',
				description: `En ${excedido.producto} talle ${excedido.talle} ingresaste más nombres que la cantidad elegida. Aumentá la cantidad o quitá nombres.`,
			});
			return false;
		}

		const largo = this.primerNombreLargo();

		if (largo)
		{
			this.notificaciones.error({
				title: 'Nombre demasiado largo',
				description: `En ${largo.producto} talle ${largo.talle}, "${largo.nombre}" tiene más de ${LARGO_MAXIMO_NOMBRE} caracteres. Acortalo para poder guardar.`,
			});
			return false;
		}

		const prendas = this.construirPrendasActuales();

		this.guardando.set(true);
		let exito = false;

		try
		{
			await firstValueFrom(this.clientesPortalService.guardarPrendas(prendas));
			this.notificaciones.success({
				title: 'Progreso guardado',
				description: 'Los talles cargados se guardaron correctamente.',
			});
			exito = true;
		}
		catch
		{
			this.notificaciones.error({
				title: 'No se pudo guardar',
				description: 'Revisá tu conexión e intentá de nuevo.',
			});
		}
		finally
		{
			this.guardando.set(false);
		}

		return exito;
	}

    async verTallesCargados()
    {
        if (this.generandoResumen() || this.guardando())
        {
            return;
        }

        const guardadoOk = await this.guardarProgreso();

        if (!guardadoOk)
        {
            return;
        }

        if (await this.cargarResumen())
        {
            this.vistaResumen.set(true);
        }
    }

    private async cargarResumen(): Promise<boolean>
    {
        this.generandoResumen.set(true);
        let exito = false;

        try
        {
            const blob = await firstValueFrom(this.clientesPortalService.obtenerResumenTalles());
            this.liberarUrlResumen();
            this.urlResumenBlob = URL.createObjectURL(blob);
            this.urlResumenSegura.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.urlResumenBlob));
            exito = true;
        }
        catch
        {
            this.notificaciones.error({
                title: 'No se pudo generar el resumen',
                description: 'Revisá tu conexión e intentá de nuevo.',
            });
        }
        finally
        {
            this.generandoResumen.set(false);
        }

        return exito;
    }

    cerrarResumen()
    {
        this.liberarUrlResumen();
        this.urlResumenSegura.set(null);
        this.vistaResumen.set(false);
    }

    async confirmarTalles()
    {
        if (this.confirmando())
        {
            return;
        }

        const imagenFirma = await this.firma()?.obtenerImagen();

        if (!imagenFirma)
        {
            this.firmaFaltante.set(true);
            this.notificaciones.error({
                title: 'Falta la firma',
                description: 'Firmá en el recuadro antes de confirmar los talles.',
            });
            return;
        }

        this.firmaFaltante.set(false);

        const confirmado = await this.confirmationService.confirm({
            title: 'Confirmar talles',
            description: 'Una vez confirmados, los talles ya no se van a poder modificar. ¿Querés continuar?',
        });

        if (!confirmado)
        {
            return;
        }

        this.confirmando.set(true);

        try
        {
            await firstValueFrom(this.clientesPortalService.confirmarTalles(imagenFirma));

            this.notificaciones.success({
                title: 'Talles confirmados',
                description: 'El pedido quedó confirmado con tu firma.',
            });

            // La página de Talles pasa a mostrar solo el PDF firmado (sin pestañas)
            this.tallesConfirmacion.confirmados.set(true);
        }
        catch
        {
            this.notificaciones.error({
                title: 'No se pudieron confirmar los talles',
                description: 'Revisá tu conexión e intentá de nuevo.',
            });
        }
        finally
        {
            this.confirmando.set(false);
        }
    }

    async guardarCambiosDefinitivos()
    {
        if (this.confirmando())
        {
            return;
        }

        const confirmado = await this.confirmationService.confirm({
            title: 'Guardar cambios',
            description: 'Se van a guardar los talles modificados y se va a actualizar el presupuesto. Después ya no se van a poder modificar. ¿Querés continuar?',
        });

        if (!confirmado)
        {
            return;
        }

        this.confirmando.set(true);

        try
        {
            await firstValueFrom(this.clientesPortalService.guardarTallesEditados());

            this.notificaciones.success({
                title: 'Cambios guardados',
                description: 'Los talles se actualizaron correctamente.',
            });

            // Se cierra la edición: la página vuelve a mostrar el resumen firmado
            this.tallesConfirmacion.edicionHabilitada.set(false);
        }
        catch (err: any)
        {
            this.notificaciones.error({
                title: 'No se pudieron guardar los cambios',
                description: err?.error?.message ?? 'Revisá tu conexión e intentá de nuevo.',
            });
        }
        finally
        {
            this.confirmando.set(false);
        }
    }

    private liberarUrlResumen()
    {
        if (this.urlResumenBlob)
        {
            URL.revokeObjectURL(this.urlResumenBlob);
            this.urlResumenBlob = null;
        }
    }

    ngOnDestroy()
    {
        this.liberarUrlResumen();
    }
}
