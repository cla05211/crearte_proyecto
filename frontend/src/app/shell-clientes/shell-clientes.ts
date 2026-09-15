import { Component, OnInit, signal } from '@angular/core';
import { ClientesAuthService } from '../services/clientes-auth-service/clientes-auth-service';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell-clientes',
  imports: [RouterOutlet],
  templateUrl: './shell-clientes.html',
  styleUrl: './shell-clientes.css',
})
export class ShellClientes
 {
  sidebarAbierto = signal(false);

  constructor(private authService: ClientesAuthService, private router: Router) {}


  toggleSidebar(): void
  {
    this.sidebarAbierto.update(valor => !valor);
  }

  cerrarSidebar(): void
  {
    this.sidebarAbierto.set(false);
  }

  cerrarSesion(): void
  {
    this.authService.cerrarSesion();
    this.router.navigate(['/login-clientes']);
  }
}
