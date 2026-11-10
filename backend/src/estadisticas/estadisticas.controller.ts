import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
    async obtenerEstadisticasVentas(@Query('anio') anio?: string):Promise<EstadisticasVentasDTO[]>
    {
        return await this.estadisticasSerivce.obtenerEstadisticasVentas(anio ? Number(anio) : undefined);
    }
    
    @Get('produccion')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_estadisticas')
    async obtenerEstadisticaProduccion(@Query('anio') anio?: string):Promise<EstadisticasProduccionDTO[]>
    {
        return await this.estadisticasSerivce.obtenerEstadisticasProduccion(anio ? Number(anio) : undefined);
    }

    @Get('bancos')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_estadisticas')
    async obtenerEstadisticasBancos(@Query('anio') anio?: string):Promise<EstadisticasBancosDTO>
    {
        return await this.estadisticasSerivce.obtenerEstadisticasBancos(anio ? Number(anio) : undefined);
    }

    @Get('cobranzas')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_estadisticas')
    async obtenerEstadisticasCobranzas(@Query('anio') anio?: string):Promise<EstadisticasCobranzasDTO[]>
    {
        return await this.estadisticasSerivce.obtenerEstadisticasCobranzas(anio ? Number(anio) : undefined);
    }
}
