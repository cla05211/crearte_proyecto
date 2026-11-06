import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { ClientesAuthService } from '../services/clientes-auth-service/clientes-auth-service';

// Los accesos a las páginas están como botones en el inicio (portal-cliente), no hay barra lateral.
@Component({
  selector: 'app-shell-clientes',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './shell-clientes.html',
  styleUrl: './shell-clientes.css',
})
export class ShellClientes
{
  private readonly authService = inject(ClientesAuthService);
  private readonly router = inject(Router);

  // Fuera del inicio se muestra el botón "Inicio" en la barra superior para volver
  // Se guarda con la sesión al loguearse
  readonly colegio = this.authService.cliente?.colegio ?? null;
  readonly usuario = this.authService.cliente?.usuario ?? null;

  readonly enInicio = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map(() => this.esInicio()),
    ),
    { initialValue: this.esInicio() },
  );

  private esInicio(): boolean
  {
    return this.router.url.split(/[?#]/)[0] === '/portal-cliente';
  }

  cerrarSesion(): void
  {
    this.authService.cerrarSesion();
    this.router.navigate(['/login-clientes']);
  }
}
