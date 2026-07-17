import { Component } from '@angular/core';
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
  usuarios: UsuarioRespuestaGet[] = [];
  cargando = false;
  empleados: UsuarioRespuestaGet[] = [];
  auth = inject(AuthService);

  ngOnInit(): void
  {
    this.obtenerUsuarios()
  }

  modificarAprobadoUsuario(id: number, aprobado: boolean): void
  {
    this.usuariosService.modificarAprobadoUsuario(id, aprobado).subscribe({
      next: () => {
        const usuario = this.usuarios.find(u => u.id === id);
        if (usuario) 
        {usuario.aprobado = aprobado;}
      },
      error: () => {
        console.log("Error");
      }
    });
  }

  obtenerUsuarios():void
  {
    console.log("Obteniendo");
    this.cargando = true;
    this.usuariosService.traerUsuarios().subscribe({
      next: (usuarios) => {
        console.log("Obtenidos");
        this.usuarios = usuarios;
        this.empleados = usuarios.filter(u => u.rol !== "Cliente");
        this.cargando = false;
          console.log(this.cargando);

      },
      error: () => {
        console.log("Error obteniendo");
        this.cargando = false;
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
      this.usuarios = this.usuarios.filter(u => u.id !== idUsuario);
      this.empleados = this.empleados.filter(u => u.id !== idUsuario);
    } 
    catch 
    {
      console.log("Error");
    }
  }

 }

