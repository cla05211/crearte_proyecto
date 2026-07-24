import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inject, inject } from '@angular/core';
import { UsuarioService } from '../../services/usuarios/usuario-service';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService } from '../../services/confirmation/confirmation.service';
import { UsuarioRespuestaGet } from '../../services/usuarios/dto/usuarioRespuestaGet';
import { AuthService } from '../../services/Auth/auth-service';

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
  usuarios = signal<UsuarioRespuestaGet[]>([]);
  empleados = signal<UsuarioRespuestaGet[]>([]);
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
      await firstValueFrom(this.usuariosService.eliminarUsuario(idUsuario));
      this.usuarios.update(lista => lista.filter(u => u.id !== idUsuario));
      this.empleados.update(lista => lista.filter(u => u.id !== idUsuario));
    }
    catch 
    {
      console.log("Error");
    }
  }

 }
