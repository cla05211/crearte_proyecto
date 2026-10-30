import { Body, Controller, Param, ParseIntPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { BeneficioPedidoDTO } from './dto/beneficioPedidoDTO';
import { BeneficiosPedidoService } from './beneficios-pedido.service';

@Controller('beneficios-pedido')
export class BeneficiosPedidoController 
{
    constructor(private beneficiosServices: BeneficiosPedidoService){}

    @Patch(':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    modificarBeneficio(@Param("id", ParseIntPipe) id: number, @Body() nuevosBeneficios: BeneficioPedidoDTO[], @Req() req)
    {
        return this.beneficiosServices.modificarBeneficios(id, nuevosBeneficios, req.usuario.id);
    }    
}
