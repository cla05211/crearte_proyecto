import { Controller, Get, UseGuards } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { EstadisticasVentasDTO } from './dto/estadisticasVentas.dto';
import { EstadisticasProduccionDTO } from './dto/estadisticasProduccion.dto';
import { EstadisticasBancosDTO } from './dto/estadisticasBancos.dto';
import { EstadisticasCobranzasDTO } from './dto/estadisticasCobranzas.dto';

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
    
    @Get('produccion')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_estadisticas')
    async obtenerEstadisticaProduccion():Promise<EstadisticasProduccionDTO[]>
    {
        return await this.estadisticasSerivce.obtenerEstadisticasProduccion();
    }

    @Get('bancos')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_estadisticas')
    async obtenerEstadisticasBancos():Promise<EstadisticasBancosDTO>
    {
        return await this.estadisticasSerivce.obtenerEstadisticasBancos();
    }

    @Get('cobranzas')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_estadisticas')
    async obtenerEstadisticasCobranzas():Promise<EstadisticasCobranzasDTO[]>
    {
        return await this.estadisticasSerivce.obtenerEstadisticasCobranzas();
    }
}
