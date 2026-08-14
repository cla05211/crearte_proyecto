import { Controller, Get, Injectable, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { PadreResponsableService } from './padre-responsable-service.service';

@Controller('padre-responsable')
export class PadreResponsableController
{
    constructor(private padreResponsableService: PadreResponsableService){}

    @Get('/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_bancos')
    async traerPadreResponsable(@Param('id', ParseIntPipe)idPedido: number)
    {
        return await this.padreResponsableService.traerPadreResponsables(idPedido);
    }

}
