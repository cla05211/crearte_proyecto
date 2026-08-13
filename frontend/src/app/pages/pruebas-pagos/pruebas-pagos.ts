import { Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { PagosService } from '../../services/pagos/pagos-service';

@Component({
  selector: 'app-pruebas-pagos',
  imports: [JsonPipe],
  templateUrl: './pruebas-pagos.html',
  styleUrl: './pruebas-pagos.css',
  standalone: true,
})
export class PruebasPagos 
{
    private pagosService = inject(PagosService);
 
  archivoSeleccionado = signal<File | null>(null);
  cargando = signal(false);
  resultado = signal<any>(null);
  error = signal<string | null>(null);
 
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivoSeleccionado.set(input.files[0]);
      this.resultado.set(null);
      this.error.set(null);
    }
  }
 
  enviarComprobante() {
    const archivo = this.archivoSeleccionado();
    if (!archivo) {
      this.error.set('Primero seleccioná un archivo.');
      return;
    }
 
    const formData = new FormData();
    formData.append('comprobante', archivo, archivo.name);
 
    this.cargando.set(true);
    this.error.set(null);
    this.resultado.set(null);
 
    this.pagosService.comprobarDatosComprobante(formData).subscribe({
      next: (res) => {
        this.resultado.set(res);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al procesar comprobante:', err);
        this.error.set('Hubo un error al procesar el comprobante. Mirá la consola.');
        this.cargando.set(false);
      }
    });
  }
}
