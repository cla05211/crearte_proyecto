import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AnioEstadisticas } from '../../services/estadisticas/anio-estadisticas';

// Pantalla madre de estadísticas: muestra las pestañas y cada "ventana"
// (ventas, y las que se agreguen después) se carga como ruta hija.
// El año elegido acá lo usan todas las ventanas.
@Component({
  selector: 'app-estadisticas',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FormsModule],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css',
})
export class Estadisticas
{
  readonly anioEstadisticas = inject(AnioEstadisticas);
}
