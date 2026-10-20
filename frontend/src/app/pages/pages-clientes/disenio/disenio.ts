import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ClientesPortalService } from '../../../services/clientes-portal/clientes-portal-service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { DisenioResponseDTO } from '../../../services/disenios/dto/DisenioResponseDTO';

// Así se guardan en documentos.tipo; en pantalla se muestran como "Diseño ..."
const PREFIJO_TIPO = 'Disenio ';
// Orden en que se muestran: primero las fijas, después las que sumaron los diseñadores
const ORDEN_FIJOS = ['Disenio Prendas', 'Disenio Bandera'];

@Component({
  selector: 'app-disenio',
  imports: [],
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
        }
        catch
        {
            this.notificaciones.error({ title: 'No se pudieron cargar los diseños', description: 'Recargá la página o intentá más tarde.' });
        }
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
