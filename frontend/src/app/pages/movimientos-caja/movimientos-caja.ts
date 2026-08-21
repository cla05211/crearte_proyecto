import { Component, inject } from '@angular/core';
import { MovimientosCajaService } from '../../services/movimientosCaja/movimientos-caja-service';
import { MovimientoCajaResponseDTO } from '../../services/movimientosCaja/dto/movimientoCajaResponse.dto';
import { UsuarioService } from '../../services/usuarios/usuario-service';
import { PagosService } from '../../services/pagos/pagos-service';

@Component({
  selector: 'app-movimientos-caja',
  imports: [],
  templateUrl: './movimientos-caja.html',
  styleUrl: './movimientos-caja.css',
})
export class MovimientosCaja 
{
  private readonly movimientosCajaService = inject(MovimientosCajaService);
  private readonly pagosService = inject(PagosService);
  private readonly usuariosService = inject(UsuarioService);

  ngOnInit(): void {}

  cargarMovimientos()
  {
    // llama a this.movimientosCajaService.obtenerMovimientos
  }

  agregarMovimiento()
  {
    //llama a this.movimientosCajaService.agregarMovimiento();
  }

  eliminarMovimiento()
  {
    //llama a this.movimientosCajaService.eliminarMovimiento();
  }

  traerTotalIngresos()
  {
    //llama a this.movimientosCajaService.obtenerTotalIngresos() y a this.pagosService.traerTotalIngresosEfectivos();
  }

  traerTotalEgresos()
  {
    //llama a this.movimientosCajaService.obtenerTotalEgresos();
  }

  traerUsuarioPorId(id: number)
  {
    //llama a this.usuariosService.traerUsuarioPorId(id)
  }
}
