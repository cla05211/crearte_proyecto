import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ClientesPortalService } from '../../../services/clientes-portal/clientes-portal-service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { DisenioResponseDTO } from '../../../services/disenios/dto/DisenioResponseDTO';
import { VisorBoceto } from '../../../shared/visor-boceto/visor-boceto';

interface ImagenesBoceto
{
    url: string;        // chica: tarjeta
    urlGrande: string;  // grande: visor
}

// Así se guardan en documentos.tipo; en pantalla se muestran como "Diseño ..."
const PREFIJO_TIPO = 'Disenio ';
// Orden en que se muestran: primero las fijas, después las que sumaron los diseñadores
const ORDEN_FIJOS = ['Disenio Prendas', 'Disenio Bandera'];

@Component({
  selector: 'app-disenio',
  imports: [VisorBoceto],
  templateUrl: './disenio.html',
  styleUrl: './disenio.css',
})
export class Disenio implements OnInit
{
    private readonly clientesPortalService = inject(ClientesPortalService);
    private readonly notificaciones = inject(NotificationService);

    readonly cargando = signal(true);
    readonly disenios = signal<DisenioResponseDTO[]>([]);

    readonly descargandoId = signal<number | null>(null);
    readonly descargandoFirmadoId = signal<number | null>(null);

    // Imagen de cada boceto por id de documento: undefined = cargando, null = no se pudo generar
    readonly previews = signal<Record<number, ImagenesBoceto | null>>({});
    // Boceto abierto en el visor
    readonly previewAbierta = signal<{ imagenes: ImagenesBoceto; titulo: string } | null>(null);

    readonly diseniosOrdenados = computed(() =>
        [...this.disenios()].sort((a, b) => this.posicion(a.tipo) - this.posicion(b.tipo)));

    readonly todosFirmados = computed(() =>
        this.disenios().length > 0 && this.disenios().every(d => d.firmado));

    async ngOnInit()
    {
        await this.cargarDisenios();
        this.cargando.set(false);
    }

    private async cargarDisenios(): Promise<void>
    {
        try
        {
            const { disenios } = await firstValueFrom(this.clientesPortalService.obtenerDisenios());
            this.disenios.set(disenios);

            // Sin await: la lista aparece enseguida y cada imagen se completa cuando llega
            this.cargarPreviews(disenios);
        }
        catch
        {
            this.notificaciones.error({ title: 'No se pudieron cargar los diseños', description: 'Recargá la página o intentá más tarde.' });
        }
    }

    // ── Previews ──────────────────────────────────────────────────────────

    // La primera vez que se pide la de un boceto viejo, el backend la genera: puede tardar unos segundos
    private cargarPreviews(disenios: DisenioResponseDTO[]): void
    {
        for (const disenio of disenios)
        {
            firstValueFrom(this.clientesPortalService.obtenerUrlPreviewDisenio(disenio.id))
                .then(imagenes => this.guardarPreview(disenio.id, imagenes))
                .catch(() => this.guardarPreview(disenio.id, null));
        }
    }

    private guardarPreview(id: number, imagenes: ImagenesBoceto | null): void
    {
        this.previews.update(actuales => ({ ...actuales, [id]: imagenes }));
    }

    // Si la imagen no carga (ej: la URL venció), se vuelve al ícono
    marcarPreviewRota(id: number): void
    {
        this.guardarPreview(id, null);
    }

    abrirPreview(disenio: DisenioResponseDTO, imagenes: ImagenesBoceto): void
    {
        this.previewAbierta.set({ imagenes, titulo: this.etiqueta(disenio) });
    }

    cerrarPreview(): void
    {
        this.previewAbierta.set(null);
    }

    etiqueta(disenio: DisenioResponseDTO): string
    {
        return 'Diseño ' + disenio.tipo.slice(PREFIJO_TIPO.length);
    }

    // Fijos en su orden; el resto queda después, en el orden en que se crearon
    private posicion(tipo: string): number
    {
        const indice = ORDEN_FIJOS.indexOf(tipo);
        return indice === -1 ? ORDEN_FIJOS.length : indice;
    }

    // ── Descargas ─────────────────────────────────────────────────────────

    async descargar(disenio: DisenioResponseDTO): Promise<void>
    {
        this.descargandoId.set(disenio.id);

        try
        {
            const { url } = await firstValueFrom(
                this.clientesPortalService.obtenerUrlDescargaDisenio(disenio.id, this.etiqueta(disenio)));

            this.abrirDescarga(url);
        }
        catch
        {
            this.notificaciones.error({ title: 'Error', description: 'No se pudo descargar el diseño.' });
        }
        finally
        {
            this.descargandoId.set(null);
        }
    }

    // Boceto firmado (JPG) que subió el equipo una vez recibida la firma
    async descargarFirmado(disenio: DisenioResponseDTO): Promise<void>
    {
        if (!disenio.firmado) return;

        this.descargandoFirmadoId.set(disenio.id);

        try
        {
            const { url } = await firstValueFrom(
                this.clientesPortalService.obtenerUrlDescargaFirmado(disenio.id, `${this.etiqueta(disenio)} firmado`));

            this.abrirDescarga(url);
        }
        catch
        {
            this.notificaciones.error({ title: 'Error', description: 'No se pudo descargar el diseño firmado.' });
        }
        finally
        {
            this.descargandoFirmadoId.set(null);
        }
    }

    // La URL firmada ya viene con "descargar como", así que alcanza con abrirla
    private abrirDescarga(url: string): void
    {
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.click();
    }
}
