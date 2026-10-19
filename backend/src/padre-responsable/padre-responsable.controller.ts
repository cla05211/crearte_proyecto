import { Controller, Get, Injectable, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
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

    @Patch(':id/:idNuevoPadrePrincipal')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_datos')
    modificarPadrePrincipal(@Param("id", ParseIntPipe) idGrupo: number, @Param('idNuevoPadrePrincipal', ParseIntPipe) idNuevoPadrePrincipal:number):Promise<null>
    {
        return this.padreResponsableService.modificarPadrePrincipal(idNuevoPadrePrincipal,idGrupo);
    }    

}
