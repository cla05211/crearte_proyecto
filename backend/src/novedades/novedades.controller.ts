import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { NovedadDTO } from './dto/Novedad.dto';
import { NovedadesService } from './novedades.service';

@Controller('novedades')
export class NovedadesController 
{
    constructor(private novedadesService: NovedadesService){}

    @Get('ventas')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_novedades_ventas')
    async obtenerNovedadesVentas():Promise<NovedadDTO[]>
    {
        return await this.novedadesService.obtenerNuevasVentas();
    }

    @Get('produccion')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_novedades_produccion')
    async obtenerNovedadesProduccion():Promise<NovedadDTO[]>
    {
        return await this.novedadesService.obtenerPedidosListosProduccion();
    }
}
