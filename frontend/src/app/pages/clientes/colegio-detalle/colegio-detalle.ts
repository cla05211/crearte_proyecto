import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PermisosService } from '../../../services/permisos/permisos';

@Component({
  selector: 'app-colegio-detalle',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './colegio-detalle.html',
  styleUrl: './colegio-detalle.css',
})
export class ColegioDetalle
{
  private readonly route = inject(ActivatedRoute);
  private readonly permisosService = inject(PermisosService);

  readonly idGrupo = Number(this.route.snapshot.paramMap.get('id'));

  tienePermiso(nombre: string): boolean
  {
    return this.permisosService.tienePermiso(nombre);
  }
}
