import { Component } from '@angular/core';
import { Inject, inject } from '@angular/core';
import { UsuarioService } from '../../services/usuarios/usuario-service';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService } from '../../services/confirmation/confirmation.service';
import { UsuarioRespuestaGet } from '../../services/usuarios/dto/usuarioRespuestaGet';
import { AuthService } from '../../services/Auth/auth-service';

@Component({
  selector: 'app-usuarios',
  imports: [],
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
    this.obtenerUsuarios();
    this.empleados = this.usuarios.filter(u => u.rol !== "Cliente");
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
    this.cargando = true;
    this.usuariosService.traerUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
        this.cargando = false;
      },
      error: () => {
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
    } 
    catch 
    {
      console.log("Error");
    }
  }

 }

