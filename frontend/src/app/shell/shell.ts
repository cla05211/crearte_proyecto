import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/Auth/auth-service';
import { Usuario } from '../../interfaces/usuario';
import { RolService } from '../services/roles/rol-service';
import { PermisosService } from '../services/permisos/permisos';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.css'
})
export class Shell implements OnInit {

  usuario = signal<Usuario|null>(null); 
  sidebarAbierto = signal(false);
  rol = signal<string>('');

  constructor(private authService: AuthService, private router: Router, private rolesService: RolService, private permisosService: PermisosService) {}

  ngOnInit()
  {
    const usuarioCargado = this.authService.cargarUsuarioDesdeStorage();
    if(usuarioCargado)
    {
      this.usuario.set(usuarioCargado);
      this.rolesService.obtenerNombreRolPorNumero(usuarioCargado.rol).subscribe({
      next: (data) => {
        this.rol.set(data.nombre_rol);
      }
    });;
    }

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
  }

  tienePermiso(nombre: string): boolean
  {
    return this.permisosService.tienePermiso(nombre);
  }
}
