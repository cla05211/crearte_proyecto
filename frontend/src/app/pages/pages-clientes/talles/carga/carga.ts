import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ClientesPortalService } from '../../../../services/clientes-portal/clientes-portal-service';
import { NotificationService } from '../../../../shared/notifications/notification.service';
import { productosPedidoIdNombreDTO } from '../../../../services/productosPedidos/dto/ProductoPedidoIdNombre.dto';
import { PrendaPedidoDTO } from '../../../../services/clientes-portal/dto/prenda.dto';

const ID_PANTALON = 72;
const ID_BANDERA = 73;
const IDS_CAMPERA_BUZO = [63, 64, 71];

const TALLES_CAMPERA_BUZO_SECUNDARIA = ['XS', 'S', 'M', 'M ESP.', 'L', 'XL', 'XXL'];
const TALLES_CAMPERA_BUZO_PRIMARIA = ['10', '12', '14', '16', '18', 'L'];
const TALLES_REMERA_CHOMBA_SECUNDARIA = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const TALLES_REMERA_CHOMBA_PRIMARIA = ['10', '12', '14', '16', '18', 'L'];
const TALLES_PANTALON = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];


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

@Component({
  selector: 'app-carga',
  imports: [],
  templateUrl: './carga.html',
  styleUrl: './carga.css',
})
export class Carga implements OnInit, OnDestroy
{
    private readonly clientesPortalService = inject(ClientesPortalService);
    private readonly notificaciones = inject(NotificationService);
    private readonly sanitizer = inject(DomSanitizer);

    readonly cargando = signal(true);
    readonly guardando = signal(false);

    readonly generandoResumen = signal(false);
    readonly vistaResumen = signal(false);
    readonly urlResumenSegura = signal<SafeResourceUrl | null>(null);
    private urlResumenBlob: string | null = null;

    private readonly idPedido = signal<number | null>(null);
    private readonly secundaria = signal(false);
    private readonly productos = signal<productosPedidoIdNombreDTO[]>([]);

    readonly valores = signal<Record<string, string>>({});

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
            this.valores.set(this.reconstruirValores(prendas));
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

    private reconstruirValores(prendas: PrendaPedidoDTO[]): Record<string, string>
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

        for (const [clave, lista] of porClave)
        {
            const esPantalon = lista[0].id_producto === ID_PANTALON;

            valores[clave] = esPantalon
                ? String(lista.length)
                : lista
                    .filter(prenda => prenda.inscripcion !== null)
                    .map(prenda => prenda.inscripcion)
                    .join(' ');
        }

        return valores;
    }

    clave(idProducto: number, talle: string): string
    {
      return `${idProducto}__${talle}`;
    }

    valor(clave: string): string
    {
      return this.valores()[clave] ?? '';
    }

    cantidadNombres(clave: string): number
    {
        const texto = this.valor(clave).trim();
        return texto.length === 0 ? 0 : texto.split(/\s+/).length;
    }

    actualizarValor(clave: string, valor: string)
    {
        this.valores.update(actual => ({ ...actual, [clave]: valor }));
    }

    onInputNombres(event: Event, clave: string)
    {
        this.actualizarValor(clave, (event.target as HTMLInputElement).value);
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
					const cantidad = Math.max(0, Math.trunc(Number(valor)) || 0);

					for (let i = 0; i < cantidad; i++)
					{
						prendas.push({ id_pedido: idPedido, id_producto: producto.idProductoOriginal, talle, inscripcion: null });
					}
				}
				else
				{
					const nombres = valor.trim().length === 0 ? [] : valor.trim().split(/\s+/);

					for (const nombre of nombres)
					{
						const nombreMayus = nombre.toUpperCase();
						prendas.push({ id_pedido: idPedido, id_producto: producto.idProductoOriginal, talle, inscripcion: nombreMayus });
					}
				}
			}
		}

		return prendas;
	}

    async guardarProgreso(): Promise<boolean>
    {
		const idPedido = this.idPedido();

		if (this.guardando() || idPedido === null)
		{
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

        this.generandoResumen.set(true);

        try
        {
            const blob = await firstValueFrom(this.clientesPortalService.obtenerResumenTalles());
            this.liberarUrlResumen();
            this.urlResumenBlob = URL.createObjectURL(blob);
            this.urlResumenSegura.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.urlResumenBlob));
            this.vistaResumen.set(true);
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
    }

    cerrarResumen()
    {
        this.liberarUrlResumen();
        this.urlResumenSegura.set(null);
        this.vistaResumen.set(false);
    }

    async confirmarTalles()
    {

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
