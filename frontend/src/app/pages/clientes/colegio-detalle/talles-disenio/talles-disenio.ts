import { Component, inject, signal } from '@angular/core';
import { DiseniosService } from '../../../../services/disenios/disenios-service';
import { ActivatedRoute } from '@angular/router';
import { filter, switchMap, tap } from 'rxjs';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-talles-disenio',
  imports: [],
  templateUrl: './talles-disenio.html',
  styleUrl: './talles-disenio.css',
})
export class TallesDisenio 
{
    private readonly diseniosService = inject(DiseniosService);
    private readonly route = inject(ActivatedRoute);

    progresoSubida = signal<number | null>(null);
    idGrupo = Number(this.route.parent?.snapshot.paramMap.get('id'));

    subirDiseno(archivo: File, tipo: string, idDocumentoExistente?: number)
    {

        if (archivo.type !== 'application/pdf')
        {
            return;
        }

        this.progresoSubida.set(0);

        this.diseniosService.pedirUrlSubida(this.idGrupo).pipe(
            switchMap(({ ruta, signedUrl }) =>
                this.diseniosService.subirArchivoAUrlFirmada(signedUrl, archivo).pipe(
                    tap(evento => {
                    if (evento.type === HttpEventType.UploadProgress && evento.total)
                        {
                            this.progresoSubida.set(Math.round(100 * evento.loaded / evento.total));
                        }
                    }),
                            filter(evento => evento.type === HttpEventType.Response),
                            switchMap(() => idDocumentoExistente
                            ? this.diseniosService.reemplazar(this.idGrupo, idDocumentoExistente, ruta)
                            : this.diseniosService.confirmar(this.idGrupo, tipo, ruta)),
                )
            ),
        ).subscribe({
            next: ({ idDocumento }) => {
            this.progresoSubida.set(null);
            },
            error: (err) => {
            this.progresoSubida.set(null);
            },
        });
    }
}
