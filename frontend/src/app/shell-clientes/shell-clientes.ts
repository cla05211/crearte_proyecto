import { Component, OnInit, inject, signal } from '@angular/core';
import { ClientesAuthService } from '../services/clientes-auth-service/clientes-auth-service';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ClientesPortalService } from '../services/clientes-portal/clientes-portal-service';
 
@Component({
  selector: 'app-shell-clientes',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell-clientes.html',
  styleUrl: './shell-clientes.css',
})
export class ShellClientes implements OnInit
 {
  private readonly clientesPortalService = inject(ClientesPortalService);

  sidebarAbierto = signal(false);

  // "Contrato" aparece en el menú recién cuando el pedido tiene fecha de entrega aproximada
  contratoDisponible = signal(false);
 
  constructor(private authService: ClientesAuthService, private router: Router) {}

  async ngOnInit()
  {
    const disponible = await firstValueFrom(this.clientesPortalService.obtenerContratoDisponible()).catch(() => false);
    this.contratoDisponible.set(disponible);
  }
 
 
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
 
