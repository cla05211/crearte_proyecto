import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { BeneficiosService } from './beneficios.service';

@Controller('beneficios')
export class BeneficiosController 
{
    constructor(private beneficiosServices: BeneficiosService){}

    @Get()
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_productos')
    traerBeneficiosDisponibles()
    {
        return this.beneficiosServices.traerBeneficiosDisponibles();
    }
}
