import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';

@Controller('pagos')
export class PagosController 
{
    constructor(private pagosService: PagosService){}
    
    @Get(':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modficar_pedidos')
    async obtenerCuotasIdPedido(@Param ('id', ParseIntPipe) id:number)
    {
        return await this.pagosService.traerPagosPedido(id);
    }
}
