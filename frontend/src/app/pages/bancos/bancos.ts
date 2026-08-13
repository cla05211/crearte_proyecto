import { Component, inject, signal} from '@angular/core';
import { PagoBancoResponse } from '../../services/pagos/dto/pagoBancoResponse.dto';
import { PagosService } from '../../services/pagos/pagos-service';

@Component({
  selector: 'app-bancos',
  imports: [],
  templateUrl: './bancos.html',
  styleUrl: './bancos.css',
})
export class Bancos 
{
  private readonly pagosService = inject(PagosService);
  pagosComafi = signal<PagoBancoResponse[]>([]);
  pagosSantander = signal<PagoBancoResponse[]>([]);

  ngOnInit(): void 
  {
    this.obtenerPagosComafi();
    this.obtenerPagosSantander();
  }

  obtenerPagosComafi()
  {
    this.pagosService.traerPagosBanco("COMAFI")
    .subscribe({
      next: (pagos) => {
        this.pagosComafi.set(pagos);
      },
      error: () => {
      },
    });
  }

  obtenerPagosSantander()
  {
    this.pagosService.traerPagosBanco("Santander")
    .subscribe({
      next: (pagos) => {
        this.pagosSantander.set(pagos);
      },
      error: () => {
      },
    });
  }
}
