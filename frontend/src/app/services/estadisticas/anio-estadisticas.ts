import { Injectable, signal } from '@angular/core';

// Año que se está mirando en Estadísticas. Lo elige el selector de la pantalla madre
// y lo leen las cuatro ventanas (ventas, producción, bancos, cuentas corrientes).
@Injectable({
  providedIn: 'root',
})
export class AnioEstadisticas
{
    readonly anioActual = new Date().getFullYear();

    // Desde el primer año de uso del sistema (2027) hasta el actual; si todavía no llegó, el actual y el anterior
    readonly aniosDisponibles = Array.from(
        { length: Math.max(this.anioActual - 2027 + 1, 2) },
        (_, i) => this.anioActual - i,
    );

    readonly anio = signal(this.anioActual);
}
