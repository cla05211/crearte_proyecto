import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inject, inject } from '@angular/core';
import { UsuarioService } from '../../services/usuarios/usuario-service';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService } from '../../services/confirmation/confirmation.service';
import { UsuarioResponse } from '../../services/usuarios/dto/usuarioResponse';
import { AuthService } from '../../services/Auth/auth-service';
import { UsuarioResponseConNombreRol } from '../../services/usuarios/dto/usuarioResponseNombreRol';
import { NotificationService } from '../../shared/notifications/notification.service';

@Component({
  selector: 'app-usuarios',
  imports: [CommonModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios 
{
  usuariosService = inject(UsuarioService);
  confirmationService = inject(ConfirmationService);
  notificaciones = inject(NotificationService);
  usuarios = signal<UsuarioResponseConNombreRol[]>([]);
  empleados = signal<UsuarioResponseConNombreRol[]>([]);
  sectorSeleccionado = signal('');
  sectores = computed(() =>
    [...new Set(this.empleados().map(usuario => usuario.rol))].sort()
  );
  empleadosFiltrados = computed(() => {
    const sector = this.sectorSeleccionado();
    return sector
      ? this.empleados().filter(usuario => usuario.rol === sector)
      : this.empleados();
  });
  cargando = signal(false);
  auth = inject(AuthService);

  ngOnInit(): void
  {
    this.obtenerUsuarios()
  }

  modificarAprobadoUsuario(id: number, aprobado: boolean): void
  {
    this.usuariosService.modificarAprobadoUsuario(id, aprobado).subscribe({
      next: () => {
        this.usuarios.update(lista =>
          lista.map(u => u.id === id ? { ...u, aprobado } : u)
        );
        this.empleados.update(lista =>
          lista.map(u => u.id === id ? { ...u, aprobado } : u)
        );
      },
      error: () => {
        console.log("Error");
      }
    });
  }

  obtenerUsuarios():void
  {
    this.cargando.set(true);
    this.usuariosService.traerUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.empleados.set(usuarios.filter(u => u.rol !== "Cliente" && u.id !== this.auth.usuario?.id));
        this.cargando.set(false);
      },
      error: () => {
        console.log("Error obteniendo");
        this.cargando.set(false);
      }
    });
  }
  
  async eliminarUsuario(idUsuario: number)
  {
    const confirmado = await this.confirmationService.confirm({title: 'Eliminar usuario',description: '¿Está seguro de que desea eliminar este usuario?'});

    if (!confirmado) 
    {
      return;
    }

    try 
    {
      const respuesta = await firstValueFrom(this.usuariosService.eliminarUsuario(idUsuario)) as { desactivado?: boolean } | null;

      if (respuesta?.desactivado)
      {
        // Tiene ventas, auditorías u otros registros a su nombre: se desactiva en vez de borrarse
        this.usuarios.update(lista => lista.map(u => u.id === idUsuario ? { ...u, aprobado: false } : u));
        this.empleados.update(lista => lista.map(u => u.id === idUsuario ? { ...u, aprobado: false } : u));
        this.notificaciones.warning({
          title: 'Usuario desactivado',
          description: 'Tiene registros a su nombre (ventas, pagos o auditorías), así que se desactivó en lugar de eliminarse. Ya no puede ingresar al sistema.',
        });
        return;
      }

      this.usuarios.update(lista => lista.filter(u => u.id !== idUsuario));
      this.empleados.update(lista => lista.filter(u => u.id !== idUsuario));
    }
    catch 
    {
      this.notificaciones.error({ title: 'Error', description: 'No se pudo eliminar el usuario.' });
    }
  }

 }
