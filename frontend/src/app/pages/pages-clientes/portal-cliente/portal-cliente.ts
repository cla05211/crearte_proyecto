import { Component, OnInit, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ClientesPortalService } from '../../../services/clientes-portal/clientes-portal-service';

interface AccesoPortal {
  ruta: string;
  titulo: string;
  descripcion: string;
  // Trazos del ícono (viewBox 24x24)
  icono: string[];
}

// Inicio del portal: los accesos a cada página (antes estaban en la barra lateral del shell)
@Component({
  selector: 'app-portal-cliente',
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './portal-cliente.html',
  styleUrl: './portal-cliente.css',
})
export class PortalCliente implements OnInit
{
  private readonly clientesPortalService = inject(ClientesPortalService);

  // "Contrato" aparece recién cuando el pedido tiene fecha de entrega aproximada
  readonly contratoDisponible = signal(false);

  readonly accesos: AccesoPortal[] = [
    {
      ruta: '/cuenta-corriente',
      titulo: 'Cuenta corriente',
      descripcion: 'Tus pagos, cuotas y comprobantes.',
      icono: ['M3 7h18v12H3z', 'M3 11h18', 'M7 15h3'],
    },
    {
      ruta: '/presupuesto',
      titulo: 'Presupuesto y Beneficios',
      descripcion: 'Lo que incluye tu pedido y sus beneficios.',
      icono: ['M7 3h7l5 5v13H7z', 'M14 3v5h5', 'M10 13h6', 'M10 17h6'],
    },
    {
      ruta: '/talles',
      titulo: 'Talles',
      descripcion: 'Cargá los talles de cada egresado.',
      icono: ['M3 17 17 3l4 4L7 21H3z', 'M8 12l2 2', 'M11 9l2 2', 'M14 6l2 2'],
    },
    {
      ruta: '/disenio',
      titulo: 'Diseño',
      descripcion: 'Mirá y descargá los bocetos del buzo.',
      icono: ['M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1-.8-1.4-.8-2.3 0-.9.7-1.7 1.7-1.7H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5z', 'M7.5 11h.01', 'M10 7.5h.01', 'M14.5 7.5h.01'],
    },
  ];

  readonly accesoContrato: AccesoPortal = {
    ruta: '/contrato',
    titulo: 'Contrato',
    descripcion: 'Leé y firmá el contrato del pedido.',
    icono: ['M7 3h7l5 5v13H7z', 'M14 3v5h5', 'M9 17c1.5-2 2.5-2 3.5 0s2 2 3.5 0'],
  };

  async ngOnInit(): Promise<void>
  {
    const disponible = await firstValueFrom(this.clientesPortalService.obtenerContratoDisponible()).catch(() => false);
    this.contratoDisponible.set(disponible);
  }
}
