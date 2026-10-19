import { Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ClientesPortalService } from '../../../services/clientes-portal/clientes-portal-service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { ConfirmationService } from '../../../services/confirmation/confirmation.service';
import { FirmaComponent } from '../../../firma/firma';
import { DisenioResponseDTO } from '../../../services/disenios/dto/DisenioResponseDTO';

// Así se guardan en documentos.tipo; en pantalla se muestran como "Diseño ..."
const PREFIJO_TIPO = 'Disenio ';
// Orden en que se muestran: primero las fijas, después las que sumaron los diseñadores
const ORDEN_FIJOS = ['Disenio Prendas', 'Disenio Bandera'];

@Component({
  selector: 'app-disenio',
  imports: [FirmaComponent],
  templateUrl: './disenio.html',
  styleUrl: './disenio.css',
})
export class Disenio implements OnInit
{
    private readonly clientesPortalService = inject(ClientesPortalService);
    private readonly notificaciones = inject(NotificationService);
    private readonly confirmationService = inject(ConfirmationService);

    // Solo hay un recuadro de firma abierto a la vez, así que alcanza con un viewChild
    protected readonly firma = viewChild(FirmaComponent);

    readonly cargando = signal(true);
    readonly disenios = signal<DisenioResponseDTO[]>([]);

    // Diseño que tiene abierto el recuadro de firma (null = ninguno)
    readonly idFirmando = signal<number | null>(null);
    readonly firmaFaltante = signal(false);
    readonly enviandoFirma = signal(false);
    readonly descargandoId = signal<number | null>(null);

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

    // ── Descarga ──────────────────────────────────────────────────────────

    async descargar(disenio: DisenioResponseDTO): Promise<void>
    {
        this.descargandoId.set(disenio.id);

        try
        {
            const { url } = await firstValueFrom(
                this.clientesPortalService.obtenerUrlDescargaDisenio(disenio.id, this.etiqueta(disenio)));

            // La URL firmada ya viene con "descargar como", así que alcanza con abrirla
            const enlace = document.createElement('a');
            enlace.href = url;
            enlace.click();
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

    // ── Firma ─────────────────────────────────────────────────────────────

    abrirFirma(disenio: DisenioResponseDTO): void
    {
        this.firmaFaltante.set(false);
        this.idFirmando.set(disenio.id);
    }

    cancelarFirma(): void
    {
        this.idFirmando.set(null);
        this.firmaFaltante.set(false);
    }

    async firmar(disenio: DisenioResponseDTO): Promise<void>
    {
        if (this.enviandoFirma()) return;

        const imagenFirma = await this.firma()?.obtenerImagen();
        if (!imagenFirma)
        {
            this.firmaFaltante.set(true);
            this.notificaciones.error({ title: 'Falta la firma', description: 'Firmá en el recuadro antes de confirmar.' });
            return;
        }

        const confirmado = await this.confirmationService.confirm({
            title: 'Firmar diseño',
            description: `Vas a aprobar y firmar "${this.etiqueta(disenio)}". Una vez firmado no se puede modificar. ¿Querés continuar?`,
        });
        if (!confirmado) return;

        this.enviandoFirma.set(true);

        try
        {
            await firstValueFrom(this.clientesPortalService.firmarDisenio(disenio.id, imagenFirma));

            this.notificaciones.success({ title: 'Diseño firmado', description: `Se registró la firma de "${this.etiqueta(disenio)}".` });
            this.idFirmando.set(null);
            await this.cargarDisenios();
        }
        catch (err: any)
        {
            this.notificaciones.error({
                title: 'No se pudo firmar',
                description: err?.error?.message ?? 'Intentá de nuevo en unos minutos.',
            });
        }
        finally
        {
            this.enviandoFirma.set(false);
        }
    }
}
