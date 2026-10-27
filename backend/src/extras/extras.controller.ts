import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { ExtrasService } from './extras.service';
import { ConfirmarExtraDTO, PedirUrlSubidaExtraDTO } from './dto/extras.dto';

// Solo empleados (mismo permiso que Talles y diseño del colegio). No hay rutas para el portal de clientes.
@Controller('extras')
export class ExtrasController
{
    constructor(private extrasService: ExtrasService) {}

    @Get(':idGrupo')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async listar(@Param('idGrupo', ParseIntPipe) idGrupo: number)
    {
        return await this.extrasService.listar(idGrupo);
    }

    @Post('url-subida')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async crearUrlSubida(@Body() dto: PedirUrlSubidaExtraDTO)
    {
        return await this.extrasService.crearUrlSubida(dto);
    }

    @Post('confirmar')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async confirmar(@Body() dto: ConfirmarExtraDTO)
    {
        return await this.extrasService.confirmar(dto);
    }

    @Get(':idGrupo/:idDocumento/url-descarga')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async crearUrlDescarga(@Param('idGrupo', ParseIntPipe) idGrupo: number, @Param('idDocumento', ParseIntPipe) idDocumento: number)
    {
        return await this.extrasService.crearUrlDescarga(idGrupo, idDocumento);
    }

    @Delete(':idGrupo/:idDocumento')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async eliminar(@Param('idGrupo', ParseIntPipe) idGrupo: number, @Param('idDocumento', ParseIntPipe) idDocumento: number)
    {
        return await this.extrasService.eliminar(idGrupo, idDocumento);
    }
}
