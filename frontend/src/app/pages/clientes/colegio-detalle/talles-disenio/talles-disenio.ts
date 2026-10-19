import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { filter, firstValueFrom, switchMap, tap } from 'rxjs';
import { DiseniosService } from '../../../../services/disenios/disenios-service';
import { DisenioResponseDTO } from '../../../../services/disenios/dto/DisenioResponseDTO';
import { NotificationService } from '../../../../shared/notifications/notification.service';

const PREFIJO_TIPO = 'Disenio ';
const TIPO_PRENDAS = 'Disenio Prendas';
const TIPO_BANDERA = 'Disenio Bandera';
const TIPOS_FIJOS = [TIPO_PRENDAS, TIPO_BANDERA];

const TAMANIO_MAXIMO_MB = 50;
const LARGO_MAXIMO_NOMBRE = 60;

interface FilaDisenio
{
    tipo: string;
    etiqueta: string;
    documento: DisenioResponseDTO | null;
    sinGuardar: boolean;
}

@Component({
  selector: 'app-talles-disenio',
  imports: [],
  templateUrl: './talles-disenio.html',
  styleUrl: './talles-disenio.css',
})
export class TallesDisenio implements OnInit
{
    private readonly diseniosService = inject(DiseniosService);
    private readonly notificaciones = inject(NotificationService);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    idGrupo = Number(this.route.parent?.snapshot.paramMap.get('id'));

    readonly cargando = signal(true);
    readonly disenios = signal<DisenioResponseDTO[]>([]);
    readonly tieneBandera = signal(false);
    readonly tallesConfirmados = signal(false);
    readonly ranurasNuevas = signal<string[]>([]);

    readonly subida = signal<{ tipo: string; progreso: number } | null>(null);
    readonly descargandoTipo = signal<string | null>(null);
    readonly descargandoFirmaTipo = signal<string | null>(null);
    readonly descargandoTalles = signal(false);

    readonly agregando = signal(false);
    readonly nombreNuevo = signal('');

    readonly largoMaximoNombre = LARGO_MAXIMO_NOMBRE;

    readonly filas = computed<FilaDisenio[]>(() =>
    {
        const guardados = this.disenios();
        const buscar = (tipo: string) => guardados.find(d => d.tipo === tipo) ?? null;

        const mostrarBandera = this.tieneBandera() || !!buscar(TIPO_BANDERA);
        const tiposFijos = mostrarBandera ? TIPOS_FIJOS : [TIPO_PRENDAS];

        const fijas = tiposFijos.map(tipo => this.armarFila(tipo, buscar(tipo)));

        const extras = guardados
            .filter(d => !TIPOS_FIJOS.includes(d.tipo))
            .map(d => this.armarFila(d.tipo, d));

        const nuevas = this.ranurasNuevas()
            .filter(tipo => !buscar(tipo))
            .map(tipo => this.armarFila(tipo, null, true));

        return [...fijas, ...extras, ...nuevas];
    });

    ngOnInit(): void
    {
        this.cargarDisenios();
    }

    private cargarDisenios(): void
    {
        this.diseniosService.listar(this.idGrupo)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({ disenios, tieneBandera, tallesConfirmados }) => {
                    this.disenios.set(disenios);
                    this.tieneBandera.set(tieneBandera);
                    this.tallesConfirmados.set(tallesConfirmados);
                    this.cargando.set(false);
                },
                error: () => {
                    this.cargando.set(false);
                    this.notificaciones.error({ title: 'Error', description: 'No se pudieron obtener los diseños.' });
                },
            });
    }

    private armarFila(tipo: string, documento: DisenioResponseDTO | null, sinGuardar = false): FilaDisenio
    {
        return { tipo, etiqueta: 'Diseño ' + tipo.slice(PREFIJO_TIPO.length), documento, sinGuardar };
    }


    alElegirArchivo(evento: Event, fila: FilaDisenio): void
    {
        const input = evento.target as HTMLInputElement;
        const archivo = input.files?.[0];

        input.value = '';

        if (!archivo) return;

        this.subirDiseno(archivo, fila.tipo, fila.documento?.id);
    }

    subirDiseno(archivo: File, tipo: string, idDocumentoExistente?: number)
    {
        if (archivo.type !== 'application/pdf')
        {
            this.notificaciones.error({ title: 'Formato inválido', description: 'Solo se pueden subir archivos PDF.' });
            return;
        }

        if (archivo.size > TAMANIO_MAXIMO_MB * 1024 * 1024)
        {
            this.notificaciones.error({ title: 'Archivo muy pesado', description: `El PDF no puede superar los ${TAMANIO_MAXIMO_MB} MB.` });
            return;
        }

        this.subida.set({ tipo, progreso: 0 });

        // 1. Pedimos a Nest la URL firmada para subir
        this.diseniosService.pedirUrlSubida(this.idGrupo).pipe(

            // 2. Con la URL, subimos el archivo directo a Supabase
            switchMap(({ ruta, signedUrl }) =>
                this.diseniosService.subirArchivoAUrlFirmada(signedUrl, archivo).pipe(

                    // 2a. Cada evento de progreso actualiza la barra
                    tap(evento => {
                        if (evento.type === HttpEventType.UploadProgress && evento.total)
                        {
                            this.subida.set({ tipo, progreso: Math.round(100 * evento.loaded / evento.total) });
                        }
                    }),

                    // 2b. Solo seguimos cuando la subida terminó
                    filter(evento => evento.type === HttpEventType.Response),

                    // 3. Registramos en documentos: reemplazo si ya existía, alta si es nuevo
                    switchMap(() => idDocumentoExistente
                        ? this.diseniosService.reemplazar(this.idGrupo, idDocumentoExistente, ruta)
                        : this.diseniosService.confirmar(this.idGrupo, tipo, ruta)),
                )
            ),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe({
            next: () => {
                this.subida.set(null);
                this.ranurasNuevas.update(ranuras => ranuras.filter(t => t !== tipo));
                this.notificaciones.success({
                    title: idDocumentoExistente ? 'Diseño actualizado' : 'Diseño subido',
                    description: `Se guardó el PDF de "${this.armarFila(tipo, null).etiqueta}".`,
                });
                this.cargarDisenios();
            },
            error: (err) => {
                this.subida.set(null);
                this.notificaciones.error({
                    title: 'Error',
                    description: err?.error?.message ?? 'No se pudo subir el diseño.',
                });
            },
        });
    }


    async descargarDisenio(fila: FilaDisenio): Promise<void>
    {
        if (!fila.documento) return;

        this.descargandoTipo.set(fila.tipo);

        try
        {
            const { url } = await firstValueFrom(
                this.diseniosService.obtenerUrlDescarga(this.idGrupo, fila.documento.id, fila.etiqueta));

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
            this.descargandoTipo.set(null);
        }
    }

    async descargarFirma(fila: FilaDisenio): Promise<void>
    {
        if (!fila.documento?.firmado) return;

        this.descargandoFirmaTipo.set(fila.tipo);

        try
        {
            const { url } = await firstValueFrom(
                this.diseniosService.obtenerUrlDescargaFirma(this.idGrupo, fila.documento.id, `Firma ${fila.etiqueta}`));

            const enlace = document.createElement('a');
            enlace.href = url;
            enlace.click();
        }
        catch
        {
            this.notificaciones.error({ title: 'Error', description: 'No se pudo descargar la firma.' });
        }
        finally
        {
            this.descargandoFirmaTipo.set(null);
        }
    }

    async descargarTalles(): Promise<void>
    {
        this.descargandoTalles.set(true);

        try
        {
            const blob = await firstValueFrom(this.diseniosService.descargarResumenTalles(this.idGrupo));
            const url = window.URL.createObjectURL(blob);
            const enlace = document.createElement('a');
            enlace.href = url;
            enlace.download = 'resumen-talles.pdf';
            enlace.click();
            window.URL.revokeObjectURL(url);
        }
        catch
        {
            this.notificaciones.error({ title: 'Error', description: 'No se pudo generar el resumen de talles.' });
        }
        finally
        {
            this.descargandoTalles.set(false);
        }
    }

    abrirAgregar(): void
    {
        this.nombreNuevo.set('');
        this.agregando.set(true);
    }

    cancelarAgregar(): void
    {
        this.agregando.set(false);
    }

    alEscribirNombre(evento: Event): void
    {
        this.nombreNuevo.set((evento.target as HTMLInputElement).value);
    }

    confirmarAgregar(): void
    {
        const nombre = this.nombreNuevo().trim().replace(/\s+/g, ' ');

        if (!nombre)
        {
            this.notificaciones.error({ title: 'Falta el nombre', description: 'Escribí cómo se llama el diseño.' });
            return;
        }

        const tipo = PREFIJO_TIPO + nombre;
        const yaExiste = this.filas().some(f => f.tipo.toLowerCase() === tipo.toLowerCase());

        if (yaExiste)
        {
            this.notificaciones.error({ title: 'Nombre repetido', description: `Ya hay un "Diseño ${nombre}".` });
            return;
        }

        this.ranurasNuevas.update(ranuras => [...ranuras, tipo]);
        this.agregando.set(false);
    }

    quitarRanura(tipo: string): void
    {
        this.ranurasNuevas.update(ranuras => ranuras.filter(t => t !== tipo));
    }
}
