import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { BeneficiosService } from './beneficios.service';
import { ModificarBeneficioDto } from './dto/modificarBeneficio.dto';

@Controller('beneficios')
export class BeneficiosController 
{
    constructor(private beneficiosServices: BeneficiosService, beneficiosService: BeneficiosService){}

    @Get()
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_productos')
    traerBeneficiosDisponibles()
    {
        return this.beneficiosServices.traerBeneficiosDisponibles();
    }

    @Patch(':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    modificarBeneficio(@Param("id", ParseIntPipe) id: number, @Body() dto: ModificarBeneficioDto)
    {
        return this.beneficiosServices.modificarBeneficios(dto.beneficio, id);
    }    
}
