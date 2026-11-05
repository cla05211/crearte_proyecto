import { Component, DestroyRef, ElementRef, HostListener, afterNextRender, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';

const ZOOM_MINIMO = 1;
const ZOOM_MAXIMO = 8;
const PASO_BOTON = 1.5;
const ZOOM_DOBLE_TOQUE = 3;

// Visor tipo Drive para ver un boceto sin descargarlo: ajusta la imagen a la pantalla,
// zoom con rueda / pellizco / botones / doble click, y arrastrar para moverse.
// Muestra primero la imagen chica (ya cargada en la miniatura) y la cambia por la grande cuando llega.
@Component({
    selector: 'app-visor-boceto',
    templateUrl: './visor-boceto.html',
    styleUrl: './visor-boceto.css',
})
export class VisorBoceto
{
    readonly urlGrande = input.required<string>();
    readonly urlPreview = input<string | null>(null);
    readonly titulo = input('');
    readonly permiteDescargar = input(false);
    readonly descargando = input(false);

    readonly cerrar = output<void>();
    readonly descargar = output<void>();

    private readonly escenario = viewChild.required<ElementRef<HTMLElement>>('escenario');
    private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

    readonly urlActual = signal<string | null>(null);
    readonly cargandoGrande = signal(true);
    readonly errorGrande = signal(false);

    // Tamaño "ajustado a pantalla" y transformación actual (translate + scale desde la esquina)
    private readonly tamanioAjustado = signal({ ancho: 0, alto: 0 });
    private proporcion = 297 / 210;
    readonly zoom = signal(1);
    private readonly x = signal(0);
    private readonly y = signal(0);

    readonly porcentaje = computed(() => Math.round(this.zoom() * 100));
    readonly estiloImagen = computed(() => ({
        width: `${this.tamanioAjustado().ancho}px`,
        height: `${this.tamanioAjustado().alto}px`,
        transform: `translate(${this.x()}px, ${this.y()}px) scale(${this.zoom()})`,
    }));

    // Punteros activos (mouse / dedos) para arrastrar y pellizcar
    private readonly punteros = new Map<number, { x: number; y: number }>();
    private ultimoToque = 0;
    private ultimoFueTactil = false;

    constructor()
    {
        // Mientras está abierto no se scrollea la página de atrás
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        inject(DestroyRef).onDestroy(() => document.body.style.overflow = overflowAnterior);

        // Primero la chica (instantánea) y en paralelo se baja la grande
        effect(() =>
        {
            const grande = this.urlGrande();
            this.urlActual.set(this.urlPreview() ?? grande);
            this.cargandoGrande.set(true);
            this.errorGrande.set(false);

            const imagen = new Image();
            imagen.onload = () =>
            {
                if (this.urlGrande() !== grande) return;
                this.proporcion = imagen.naturalWidth / imagen.naturalHeight;
                this.urlActual.set(grande);
                this.cargandoGrande.set(false);
                this.ajustar();
            };
            imagen.onerror = () =>
            {
                if (this.urlGrande() !== grande) return;
                this.cargandoGrande.set(false);
                this.errorGrande.set(true);
            };
            imagen.src = grande;
        });

        // <dialog> con showModal(): el navegador lo dibuja en el "top layer", por encima de TODO
        // (la barra del sistema incluida), sin importar los z-index de la página.
        afterNextRender(() =>
        {
            const dialogo = this.dialogo().nativeElement;
            if (!dialogo.open) dialogo.showModal();
            this.ajustar();
        });
    }

    // ── Ajuste a pantalla ──

    @HostListener('window:resize')
    ajustar(): void
    {
        const { clientWidth: anchoEsc, clientHeight: altoEsc } = this.escenario().nativeElement;
        if (!anchoEsc || !altoEsc) return;

        let ancho = anchoEsc;
        let alto = ancho / this.proporcion;
        if (alto > altoEsc)
        {
            alto = altoEsc;
            ancho = alto * this.proporcion;
        }

        this.tamanioAjustado.set({ ancho, alto });
        this.zoom.set(1);
        this.x.set((anchoEsc - ancho) / 2);
        this.y.set((altoEsc - alto) / 2);
    }

    alCargarImagen(evento: Event): void
    {
        const img = evento.target as HTMLImageElement;
        if (img.naturalWidth && Math.abs(img.naturalWidth / img.naturalHeight - this.proporcion) > 0.01)
        {
            this.proporcion = img.naturalWidth / img.naturalHeight;
            this.ajustar();
        }
    }

    // ── Zoom ──

    // Hace zoom manteniendo quieto el punto (px, py) del escenario (donde está el mouse o el centro del pellizco)
    private zoomEn(nuevoZoom: number, px: number, py: number): void
    {
        const zoom = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, nuevoZoom));
        if (zoom === ZOOM_MINIMO)
        {
            this.ajustar();
            return;
        }

        const factor = zoom / this.zoom();
        this.x.set(px - (px - this.x()) * factor);
        this.y.set(py - (py - this.y()) * factor);
        this.zoom.set(zoom);
        this.limitarDesplazamiento();
    }

    private centroEscenario(): { x: number; y: number }
    {
        const e = this.escenario().nativeElement;
        return { x: e.clientWidth / 2, y: e.clientHeight / 2 };
    }

    acercar(): void
    {
        const c = this.centroEscenario();
        this.zoomEn(this.zoom() * PASO_BOTON, c.x, c.y);
    }

    alejar(): void
    {
        const c = this.centroEscenario();
        this.zoomEn(this.zoom() / PASO_BOTON, c.x, c.y);
    }

    alRueda(evento: WheelEvent): void
    {
        evento.preventDefault();
        const p = this.puntoEnEscenario(evento.clientX, evento.clientY);
        this.zoomEn(this.zoom() * Math.exp(-evento.deltaY * 0.0015), p.x, p.y);
    }

    // Desde el template: en pantallas táctiles el doble toque ya lo maneja alPresionar
    alDobleClickMouse(evento: MouseEvent): void
    {
        if (!this.ultimoFueTactil) this.alDobleClick(evento);
    }

    private alDobleClick(evento: MouseEvent): void
    {
        const p = this.puntoEnEscenario(evento.clientX, evento.clientY);
        if (this.zoom() > ZOOM_MINIMO) this.ajustar();
        else this.zoomEn(ZOOM_DOBLE_TOQUE, p.x, p.y);
    }

    // No deja que la imagen se vaya del todo de la pantalla
    private limitarDesplazamiento(): void
    {
        const { clientWidth: anchoEsc, clientHeight: altoEsc } = this.escenario().nativeElement;
        const ancho = this.tamanioAjustado().ancho * this.zoom();
        const alto = this.tamanioAjustado().alto * this.zoom();

        const limitar = (valor: number, tamanio: number, espacio: number) =>
            tamanio <= espacio ? (espacio - tamanio) / 2 : Math.min(0, Math.max(espacio - tamanio, valor));

        this.x.set(limitar(this.x(), ancho, anchoEsc));
        this.y.set(limitar(this.y(), alto, altoEsc));
    }

    // ── Arrastrar y pellizcar ──

    alPresionar(evento: PointerEvent): void
    {
        (evento.target as HTMLElement).setPointerCapture?.(evento.pointerId);
        this.punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
        this.ultimoFueTactil = evento.pointerType === 'touch';

        // Doble toque en pantallas táctiles (el dblclick no siempre llega)
        if (evento.pointerType === 'touch' && this.punteros.size === 1)
        {
            const ahora = Date.now();
            if (ahora - this.ultimoToque < 300)
            {
                this.alDobleClick(evento);
                this.ultimoToque = 0;
            }
            else this.ultimoToque = ahora;
        }
    }

    alMover(evento: PointerEvent): void
    {
        const anterior = this.punteros.get(evento.pointerId);
        if (!anterior) return;

        if (this.punteros.size === 1)
        {
            if (this.zoom() > ZOOM_MINIMO)
            {
                this.x.update(v => v + evento.clientX - anterior.x);
                this.y.update(v => v + evento.clientY - anterior.y);
                this.limitarDesplazamiento();
            }
        }
        else if (this.punteros.size === 2)
        {
            const otro = [...this.punteros.entries()].find(([id]) => id !== evento.pointerId)![1];
            const distanciaAntes = Math.hypot(anterior.x - otro.x, anterior.y - otro.y);
            const distanciaAhora = Math.hypot(evento.clientX - otro.x, evento.clientY - otro.y);

            if (distanciaAntes > 0)
            {
                const centro = this.puntoEnEscenario((evento.clientX + otro.x) / 2, (evento.clientY + otro.y) / 2);
                this.zoomEn(this.zoom() * distanciaAhora / distanciaAntes, centro.x, centro.y);
            }
        }

        this.punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    }

    alSoltar(evento: PointerEvent): void
    {
        this.punteros.delete(evento.pointerId);
    }

    private puntoEnEscenario(clientX: number, clientY: number): { x: number; y: number }
    {
        const r = this.escenario().nativeElement.getBoundingClientRect();
        return { x: clientX - r.left, y: clientY - r.top };
    }

    // ── Teclado ──

    // Esc en un <dialog> dispara "cancel": se frena el cierre nativo y se avisa al padre (que lo saca del DOM)
    alCancelar(evento: Event): void
    {
        evento.preventDefault();
        this.cerrar.emit();
    }

    @HostListener('document:keydown', ['$event'])
    alTeclado(evento: KeyboardEvent): void
    {
        if (evento.key === '+' || evento.key === '=') this.acercar();
        else if (evento.key === '-') this.alejar();
        else if (evento.key === '0') this.ajustar();
    }
}
