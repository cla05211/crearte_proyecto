import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { NovedadDTO } from './dto/Novedad.dto';
import { NovedadesService } from './novedades.service';
import { AuditoriasService } from 'src/auditorias/auditorias.service';
import { FiltrosAuditoria } from 'src/auditorias/dto/AuditoriaResponse.dto';
import { TipoAuditoria } from 'src/auditorias/dto/insertarAuditoria.dto';

@Controller('novedades')
export class NovedadesController 
{
    constructor(private novedadesService: NovedadesService, private auditoriaService:AuditoriasService){}

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

    @Get('modificaciones')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_novedades_ventas')
    async obtenerNovedadesModificaciones():Promise<NovedadDTO[]>
    {
        return await this.novedadesService.obtenerPresupuestosModificados();
    }
}
