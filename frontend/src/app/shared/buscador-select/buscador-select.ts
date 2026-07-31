import { Component, ElementRef, HostListener, Input, computed, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-buscador-select',
  imports: [],
  templateUrl: './buscador-select.html',
  styleUrl: './buscador-select.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BuscadorSelect),
      multi: true,
    },
  ],
})
export class BuscadorSelect implements ControlValueAccessor {
  @Input() opciones: string[] = [];
  @Input() placeholder = 'Buscar…';
  @Input() etiquetaVacia = 'Sin resultados';

  readonly abierto = signal(false);
  readonly busqueda = signal('');
  readonly valor = signal('');
  readonly disabled = signal(false);

  private onChange: (valor: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  readonly opcionesFiltradas = computed(() => {
    const consulta = this.normalizar(this.busqueda());
    if (!consulta) return this.opciones;
    return this.opciones.filter((opcion) => this.normalizar(opcion).includes(consulta));
  });

  writeValue(valor: string): void {
    this.valor.set(valor ?? '');
    this.busqueda.set(valor ?? '');
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  @HostListener('document:click', ['$event'])
  alHacerClickFuera(evento: MouseEvent): void {
    if (!this.host.nativeElement.contains(evento.target as Node)) {
      this.cerrar();
    }
  }

  alEnfocar(): void {
    this.abierto.set(true);
    this.busqueda.set('');
  }

  alEscribir(texto: string): void {
    this.busqueda.set(texto);
    this.abierto.set(true);
    if (!texto) {
      this.valor.set('');
      this.onChange('');
    }
  }

  alPresionarEnter(): void {
    const filtradas = this.opcionesFiltradas();
    if (filtradas.length === 1) {
      this.elegir(filtradas[0]);
    }
  }

  elegir(opcion: string): void {
    this.valor.set(opcion);
    this.busqueda.set(opcion);
    this.onChange(opcion);
    this.cerrar();
  }

  cerrar(): void {
    this.abierto.set(false);
    this.busqueda.set(this.valor());
    this.onTouched();
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }
}
