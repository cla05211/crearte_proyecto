import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ClientesPortalService } from '../../../../services/clientes-portal/clientes-portal-service';
import { NotificationService } from '../../../../shared/notifications/notification.service';

// Vista de solo lectura una vez confirmados los talles: muestra el PDF del resumen con la firma.
@Component({
  selector: 'app-resumen-firmado',
  imports: [],
  templateUrl: './resumen-firmado.html',
  styleUrl: './resumen-firmado.css',
})
export class ResumenFirmado implements OnInit, OnDestroy
{
    private readonly clientesPortalService = inject(ClientesPortalService);
    private readonly notificaciones = inject(NotificationService);
    private readonly sanitizer = inject(DomSanitizer);

    readonly cargando = signal(true);
    readonly urlResumenSegura = signal<SafeResourceUrl | null>(null);
    private urlResumenBlob: string | null = null;

    async ngOnInit()
    {
        try
        {
            const blob = await firstValueFrom(this.clientesPortalService.obtenerResumenTalles());
            this.urlResumenBlob = URL.createObjectURL(blob);
            this.urlResumenSegura.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.urlResumenBlob));
        }
        catch
        {
            this.notificaciones.error({
                title: 'No se pudo cargar el resumen',
                description: 'Recargá la página o intentá más tarde.',
            });
        }
        finally
        {
            this.cargando.set(false);
        }
    }

    ngOnDestroy()
    {
        if (this.urlResumenBlob)
        {
            URL.revokeObjectURL(this.urlResumenBlob);
            this.urlResumenBlob = null;
        }
    }
}
