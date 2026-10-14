import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
