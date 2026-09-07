import { Component, inject, signal } from '@angular/core';
import { ControlTallesDisenioDTO } from '../../services/gestionPedidos/dto/ControlTallesDisenioDTO';
import { UsuarioResponseConNombreRol } from '../../services/usuarios/dto/usuarioResponseNombreRol';
import { GestionPedidosService } from '../../services/gestionPedidos/gestion-pedidos-service';
import { UsuarioService } from '../../services/usuarios/usuario-service';
import { PedidosService } from '../../services/pedidos/pedidos-service';

@Component({
  selector: 'app-talles-disenio',
  imports: [],
  templateUrl: './talles-disenio.html',
  styleUrl: './talles-disenio.css',
})
export class TallesDisenio 
{

  private readonly gestionPedidosService = inject(GestionPedidosService);
  private readonly pedidosService = inject(PedidosService);
  private readonly usuariosService = inject(UsuarioService);

  readonly pedidosTallesDisenio = signal<ControlTallesDisenioDTO[] | null>(null);
  readonly diseñadoras = signal<UsuarioResponseConNombreRol[] |null>(null);
  fechaActual: Date = new Date();
  añoActual =  this.fechaActual.getFullYear();
  mesActual = this.fechaActual.getMonth();

  ngOnInit(): void
  {
    this.traerPedidosTallesDisenio();
    this.traerDiseñadoras();
  }

  traerPedidosTallesDisenio(): void
  {
    this.gestionPedidosService.obtenerDatosPedidosControlTallesDisenio(this.mesActual,this.añoActual)
      .subscribe({
        next: (pedidos) => {
          this.pedidosTallesDisenio.set(pedidos);
        },
      })
  }

  traerDiseñadoras():void
  {
    this.usuariosService.traerUsuarios(4)
      .subscribe({
        next: (diseñadoras) => {
          this.diseñadoras.set(diseñadoras);
        },
      });
  }

  modificarDiseñadora()
  {
    //llama a this.pedidosService.modificarDiseniadora()
  }

  modificarEstadoTalles()
  {
    //llama a this.pedidosService.modificarEstadoTalles()
  }

  modificarEstadoDiseño()
  {
    //llama a this.pedidosService.modificarEstadoDisenio()
  }

  modificarFechaAprobacionDisenio()
  {
    //llama a this.pedidosService.modificarFechaAprobacionDisenio()
  }



}
