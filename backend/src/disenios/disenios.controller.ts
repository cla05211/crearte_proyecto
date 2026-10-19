import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { DiseniosService } from './disenios.service';
import { SubirDisenioDTO } from './dto/SubirDisenioDTO';
import { ReemplazarDisenioDTO } from './dto/ReemplazarDisenioDTO';

@Controller('disenios')
export class DiseniosController
{
    constructor(private diseniosService: DiseniosService) {}

    @Get(':idGrupo')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async listar(@Param('idGrupo', ParseIntPipe) idGrupo: number)
    {
        return await this.diseniosService.listar(idGrupo);
    }

    @Get(':idGrupo/resumen-talles')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async descargarResumenTalles(@Param('idGrupo', ParseIntPipe) idGrupo: number, @Res() res: Response)
    {
        const { buffer, idPedido } = await this.diseniosService.generarResumenTalles(idGrupo);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="resumen-talles-${idPedido}.pdf"`,
        });
        res.send(buffer);
    }

    @Get(':idGrupo/:idDocumento/url-descarga')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async crearUrlDescarga(
        @Param('idGrupo', ParseIntPipe) idGrupo: number,
        @Param('idDocumento', ParseIntPipe) idDocumento: number,
        @Query('nombre') nombre: string,
    )
    {
        return await this.diseniosService.crearUrlDescarga(idGrupo, idDocumento, nombre || 'disenio');
    }

    @Get(':idGrupo/:idDocumento/url-descarga-firma')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async crearUrlDescargaFirma(
        @Param('idGrupo', ParseIntPipe) idGrupo: number,
        @Param('idDocumento', ParseIntPipe) idDocumento: number,
        @Query('nombre') nombre: string,
    )
    {
        return await this.diseniosService.crearUrlDescargaFirma(idGrupo, idDocumento, nombre || 'firma');
    }

    @Post('url-subida')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async crearUrlSubida(@Body() dto: { idGrupo: number })
    {
        return await this.diseniosService.crearUrlSubida(dto.idGrupo);
    }

    @Post('confirmar')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async confirmar(@Body() dto: SubirDisenioDTO)
    {
        return await this.diseniosService.confirmar(dto);
    }

    @Post('reemplazar')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async reemplazar(@Body() dto: ReemplazarDisenioDTO)
    {
        return await this.diseniosService.reemplazar(dto);
    }
}
