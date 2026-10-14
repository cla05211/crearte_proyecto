import { Component, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ClientesPortalService } from '../../../services/clientes-portal/clientes-portal-service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { ConfirmationService } from '../../../services/confirmation/confirmation.service';
import { FirmaComponent } from '../../../firma/firma';
import { PadreResponsableResponseDTO } from '../../../services/padreResponsable/dto/padreResponsableResponse.dto';

// En el contrato firman como máximo los 3 primeros padres responsables (el back los devuelve ordenados por id)
const CANTIDAD_MAXIMA_FIRMANTES = 3;

@Component({
  selector: 'app-contrato',
  imports: [FormsModule, FirmaComponent],
  templateUrl: './contrato.html',
  styleUrl: './contrato.css',
})
export class Contrato implements OnInit, OnDestroy
{
    private readonly clientesPortalService = inject(ClientesPortalService);
    private readonly notificaciones = inject(NotificationService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly sanitizer = inject(DomSanitizer);

    protected readonly firma = viewChild(FirmaComponent);

    readonly cargando = signal(true);
    readonly disponible = signal(false);
    readonly cargandoPdf = signal(false);
    readonly urlContratoSegura = signal<SafeResourceUrl | null>(null);
    private urlContratoBlob: string | null = null;

    readonly padres = signal<PadreResponsableResponseDTO[]>([]);
    readonly idPadreSeleccionado = signal<number | null>(null);
    readonly firmaFaltante = signal(false);
    readonly firmando = signal(false);

    readonly padreSeleccionado = computed(() =>
        this.padres().find((padre) => padre.id === this.idPadreSeleccionado()) ?? null);

    readonly yaFirmoSeleccionado = computed(() => this.padreSeleccionado()?.firma != null);

    readonly todosFirmaron = computed(() =>
        this.padres().length > 0 && this.padres().every((padre) => padre.firma != null));

    async ngOnInit()
    {
        try
        {
            const disponible = await firstValueFrom(this.clientesPortalService.obtenerContratoDisponible());
            this.disponible.set(disponible);

            if (disponible)
            {
                await Promise.all([this.cargarPadres(), this.cargarContrato()]);
            }
        }
        catch
        {
            this.notificaciones.error({ title: 'No se pudo cargar el contrato', description: 'Recargá la página o intentá más tarde.' });
        }
        finally
        {
            this.cargando.set(false);
        }
    }

    nombreCompleto(padre: PadreResponsableResponseDTO): string
    {
        return `${padre.nombre ?? ''} ${padre.apellido ?? ''}`.trim();
    }

    seleccionarPadre(idPadre: number | null)
    {
        this.idPadreSeleccionado.set(idPadre);
        this.firmaFaltante.set(false);
    }

    async firmarContrato()
    {
        const padre = this.padreSeleccionado();
        if (this.firmando() || !padre) return;

        if (padre.firma != null)
        {
            this.notificaciones.error({ title: 'Ya firmó', description: `${this.nombreCompleto(padre)} ya firmó el contrato.` });
            return;
        }

        const imagenFirma = await this.firma()?.obtenerImagen();
        if (!imagenFirma)
        {
            this.firmaFaltante.set(true);
            this.notificaciones.error({ title: 'Falta la firma', description: 'Firmá en el recuadro antes de confirmar.' });
            return;
        }

        const confirmado = await this.confirmationService.confirm({
            title: 'Firmar contrato',
            description: `Vas a firmar el contrato como ${this.nombreCompleto(padre)}. Una vez firmado no se puede modificar. ¿Querés continuar?`,
        });
        if (!confirmado) return;

        this.firmando.set(true);

        try
        {
            const { todosFirmaron } = await firstValueFrom(this.clientesPortalService.firmarContrato(padre.id, imagenFirma));

            this.notificaciones.success({
                title: 'Contrato firmado',
                description: todosFirmaron
                    ? 'Ya firmaron todos los padres responsables.'
                    : `Se registró la firma de ${this.nombreCompleto(padre)}.`,
            });

            this.firma()?.limpiar();
            this.idPadreSeleccionado.set(null);

            // Se recargan los padres (para saber quién falta) y el PDF (para que aparezca la firma nueva)
            await Promise.all([this.cargarPadres(), this.cargarContrato()]);
        }
        catch
        {
            this.notificaciones.error({ title: 'No se pudo firmar el contrato', description: 'Intentá de nuevo en unos minutos.' });
        }
        finally
        {
            this.firmando.set(false);
        }
    }

    private async cargarPadres()
    {
        const padres = await firstValueFrom(this.clientesPortalService.obtenerPadresResponsables());
        this.padres.set(padres.slice(0, CANTIDAD_MAXIMA_FIRMANTES));
    }

    private async cargarContrato()
    {
        this.cargandoPdf.set(true);

        try
        {
            const blob = await firstValueFrom(this.clientesPortalService.obtenerContrato());
            this.liberarUrlContrato();
            this.urlContratoBlob = URL.createObjectURL(blob);
            this.urlContratoSegura.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.urlContratoBlob));
        }
        catch
        {
            this.notificaciones.error({ title: 'No se pudo cargar el contrato', description: 'Recargá la página o intentá más tarde.' });
        }
        finally
        {
            this.cargandoPdf.set(false);
        }
    }

    private liberarUrlContrato()
    {
        if (this.urlContratoBlob)
        {
            URL.revokeObjectURL(this.urlContratoBlob);
            this.urlContratoBlob = null;
        }
    }

    ngOnDestroy()
    {
        this.liberarUrlContrato();
    }
}
