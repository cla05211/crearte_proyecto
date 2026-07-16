import { Component } from '@angular/core';
import { Inject, inject } from '@angular/core';
import { UsuarioService } from '../../services/usuarios/usuario-service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-usuarios',
  imports: [],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios 
{
  usuariosService = inject(UsuarioService);

  async obtenerUsuarios()
  {
    this.usuariosService.traerUsuarios()
    .subscribe(usuarios => {
      console.log(usuarios);
    });
  }
  
  async eliminarUsuario()
  {
    this.usuariosService.eliminarUsuario()
    .subscribe();
  }
}
