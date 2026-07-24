import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { GestionPedidosService } from './gestion-pedidos.service';
import { CrearPedidoDTO } from './dto/crearPedido.dto';

@Controller('gestion-pedidos')
export class GestionPedidosController 
{
    constructor(private gestionService: GestionPedidosService){}

    @Post ('crear-pedido')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('crear_pedido')
    async crearPedido(@Body() dto: CrearPedidoDTO)
    {
        this.gestionService.crearPedido(dto);
    }
}
