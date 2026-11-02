import { Controller, Get, UseGuards } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { EstadisticasVentasDTO } from './dto/estadisticasVentas.dto';

@Controller('estadisticas')
export class EstadisticasController 
{
    constructor(private estadisticasSerivce: EstadisticasService){}

    @Get('ventas')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_estadisticas')
    async obtenerEstadisticasVentas():Promise<EstadisticasVentasDTO[]>
    {
        return await this.estadisticasSerivce.obtenerEstadisticasVentas();
    }
}
