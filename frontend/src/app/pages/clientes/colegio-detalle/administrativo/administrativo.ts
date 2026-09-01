import { Component, inject, signal } from '@angular/core';
import { PagoDTO } from '../../../../services/gestionPedidos/dto/pago.dto';
import { ActivatedRoute } from '@angular/router';
import { PedidosService } from '../../../../services/pedidos/pedidos-service';
import { firstValueFrom } from 'rxjs';
import { PagosService } from '../../../../services/pagos/pagos-service';
import { PagoResponseDTO } from '../../../../services/pagos/dto/pagoResponse.dto';
import { GestionPedidosService } from '../../../../services/gestionPedidos/gestion-pedidos-service';

@Component({
  selector: 'app-administrativo',
  imports: [],
  templateUrl: './administrativo.html',
  styleUrl: './administrativo.css',
})
export class Administrativo 
{
  private readonly pedidosService = inject(PedidosService);
  private readonly pagosService = inject(PagosService);
  private readonly gestionPedidosService = inject(GestionPedidosService);

  private readonly route = inject(ActivatedRoute);
  readonly pagosCliente = signal<PagoResponseDTO[]>([]);
  readonly importeTotal = signal;
  idPedido: number = 0;

  ngOnInit(): void
  {
    this.determinarIdPedido;
    this.traerPagosCliente(this.idPedido);
    this.traerImporteTotalPedido(this.idPedido);
  }

  async determinarIdPedido()
  {
    const idGrupo = Number(this.route.parent?.snapshot.paramMap.get('id'));

    this.idPedido = await firstValueFrom(this.pedidosService.obtenerIdPedidoGrupo(idGrupo));
  }

  traerImporteTotalPedido(idPedido: number)
  {
    this.gestionPedidosService.obtenerImporteTotalPedido(idPedido);
  }

  async traerPagosCliente(idPedido:number)
  {
    this.pagosService.traerPagosIdPedido(idPedido).subscribe({next: (pagos) => 
      {
        this.pagosCliente.set(pagos);
      }})
  }

  async crearPago(dto:PagoDTO)
  {
    //En este caso (esta pagina) nunca hay documento dto y todo pago es el efectivo, por lo tanto nro_transferencia se hardcodea como '', motivo: "Cuota", aprobado: TRUE, enviado_banco: false, entidad_pago va EMPTY, id_documento no hay
    this.pagosService.crearPago(dto);
  }
}
