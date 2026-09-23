import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ClientesPortalService } from '../../../services/clientes-portal/clientes-portal-service';
import { TallesConfirmacionService } from './talles-confirmacion.service';
import { ResumenFirmado } from './resumen-firmado/resumen-firmado';

const TALLES_MUESTRAS_FISICAS = 'Muestras Físicas';

@Component({
  selector: 'app-talles',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ResumenFirmado],
  providers: [TallesConfirmacionService],
  templateUrl: './talles.html',
  styleUrl: './talles.css',
})
export class Talles implements OnInit
{
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly clientesPortalService = inject(ClientesPortalService);
    readonly confirmacion = inject(TallesConfirmacionService);

    // Con muestras físicas no se muestra "¿Cómo tomar las medidas?": las medidas se toman con las muestras
    readonly muestrasFisicas = signal(false);

    async ngOnInit()
    {
        const [confirmados, tipoTalles] = await Promise.all([
            // Si no se pudo consultar, se muestran las pestañas normales: el back igual rechaza una segunda confirmación
            firstValueFrom(this.clientesPortalService.obtenerTallesConfirmados()).catch(() => false),
            firstValueFrom(this.clientesPortalService.determinartipoTalles()).catch(() => null),
        ]);

        this.muestrasFisicas.set(tipoTalles?.trim() === TALLES_MUESTRAS_FISICAS);

        // La ruta por defecto de Talles es el tutorial: con muestras físicas se va directo a la carga
        if (this.muestrasFisicas() && this.router.url.split('?')[0].endsWith('/tutorial'))
        {
            await this.router.navigate(['carga'], { relativeTo: this.route, replaceUrl: true });
        }

        this.confirmacion.confirmados.set(confirmados);
    }
}
