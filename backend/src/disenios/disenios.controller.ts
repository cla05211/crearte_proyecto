import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { DiseniosService } from './disenios.service';
import { SubirDisenioDTO } from './dto/SubirDisenioDTO';
import { ReemplazarDisenioDTO } from './dto/ReemplazarDisenioDTO';
import { ArchivoSubidoDTO } from 'src/storage/dto/ArchivoSubidoDTO';

const TAMANIO_MAXIMO_FIRMADO = 10 * 1024 * 1024;

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

    @Get(':idGrupo/:idDocumento/url-descarga-firmado')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    async crearUrlDescargaFirmado(
        @Param('idGrupo', ParseIntPipe) idGrupo: number,
        @Param('idDocumento', ParseIntPipe) idDocumento: number,
        @Query('nombre') nombre: string,
    )
    {
        return await this.diseniosService.crearUrlDescargaFirmado(idGrupo, idDocumento, nombre || 'firmado');
    }

    // Boceto firmado (JPG) que el cliente devolvió por WhatsApp: llega como multipart en el campo 'archivo'
    @Post(':idGrupo/:idDocumento/firmado')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_talles_disenio')
    @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: TAMANIO_MAXIMO_FIRMADO } }))
    async subirFirmado(
        @Param('idGrupo', ParseIntPipe) idGrupo: number,
        @Param('idDocumento', ParseIntPipe) idDocumento: number,
        @UploadedFile() archivo: ArchivoSubidoDTO,
    )
    {
        return await this.diseniosService.subirFirmado(idGrupo, idDocumento, archivo);
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
