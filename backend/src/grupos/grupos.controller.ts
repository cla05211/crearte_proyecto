import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { GruposService } from './grupos.service';

@Controller('grupos')
export class GruposController 
{
    constructor(private gruposService: GruposService){}

    @Get('clientes-page')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes')
    async obtenerGruposClientes( @Query('rangoDesde', ParseIntPipe) rangoDesde: number, @Query('rangoHasta', ParseIntPipe) rangoHasta: number,   @Query('busqueda') busqueda?: string)
    {
        return await this.gruposService.traerGruposClientePage(rangoDesde, rangoHasta, busqueda);
    }
}
