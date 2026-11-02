import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// Pantalla madre de estadísticas: muestra las pestañas y cada "ventana"
// (ventas, y las que se agreguen después) se carga como ruta hija.
@Component({
  selector: 'app-estadisticas',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css',
})
export class Estadisticas {}
