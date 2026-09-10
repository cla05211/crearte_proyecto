import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { GruposService } from './grupos.service';

@Controller('grupos')
export class GruposController 
{
    constructor(private grupos: GruposService){}

    @Get('clientes-page')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes')
    async obtenerGruposClientes(@Req() req: any,@Query('rangoDesde', ParseIntPipe) rangoDesde: number, @Query('rangoHasta', ParseIntPipe) rangoHasta: number,   @Query('busqueda') busqueda?: string)
    {
        const esFabrica = req.usuario.rol === 5;
        return await this.grupos.traerGruposClientePage(rangoDesde, rangoHasta, esFabrica, busqueda);
    }

    @Get('egresados/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    async obtenerCantidadEgresados(@Param ("id", ParseIntPipe) id: number)
    {
        return await this.grupos.traerCantidadEgresados(id);
    }

    @Get('clientes-page/datos/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes')
    async obtenerDatosGruposClientePage(@Param ("id", ParseIntPipe) id: number)
    {
        return await this.grupos.traerDatosGrupoClientePage(id);
    }

}
