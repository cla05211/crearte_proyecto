import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ClientesPortalService } from '../../../../services/clientes-portal/clientes-portal-service';

type VistaTutorial = 'video' | 'tablas';

@Component({
  selector: 'app-tutorial',
  imports: [],
  templateUrl: './tutorial.html',
  styleUrl: './tutorial.css',
})
export class Tutorial implements OnInit
{
  readonly clientesPortalService = inject(ClientesPortalService);

  secundaria = signal<boolean>(false);
  cargando = signal<boolean>(true);
  vista = signal<VistaTutorial>('video');
  imagenAmpliada = signal<{ src: string; alt: string } | null>(null);

  videoSrc = computed(() =>
    this.secundaria()
      ? '/videos/tutorial-talles-secundaria.mp4'
      : '/videos/tutorial-talles-primaria.mp4'
  );

  imagenCampera = computed(() =>
    this.secundaria()
      ? '/talles-secundaria-campera.jpeg'
      : '/talles-primaria- campera.jpeg'
  );

  imagenRemera = computed(() =>
    this.secundaria()
      ? '/talles-secundaria-remera.jpeg'
      : '/talles-primaria-remera.jpeg'
  );

  ngOnInit()
  {
    this.determinarSecundaria();
  }

  async determinarSecundaria()
  {
    try
    {
      this.secundaria.set(await firstValueFrom(this.clientesPortalService.determinarSecundaria()));
    }
    finally
    {
      this.cargando.set(false);
    }
  }

  cambiarVista(vista: VistaTutorial)
  {
    this.vista.set(vista);
  }

  ampliarImagen(src: string, alt: string)
  {
    this.imagenAmpliada.set({ src, alt });
  }

  cerrarImagenAmpliada()
  {
    this.imagenAmpliada.set(null);
  }
}
