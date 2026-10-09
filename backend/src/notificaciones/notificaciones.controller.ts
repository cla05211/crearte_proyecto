import { Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { CronSecretGuard } from './guards/cronSecret.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';

@Controller('notificaciones')
export class NotificacionesController
{
    constructor(private notificacionesService: NotificacionesService) {}

    @Post('contrato/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_administrativo')
    async enviarMensajeContrato(@Param('id', ParseIntPipe)idPedido: number)
    {
        return await this.notificacionesService.enviarMensajeContrato(idPedido);
    }

    // Lo llama pg_cron (vía pg_net) una vez por día
    @Post('procesar-recordatorios')
    @HttpCode(200)
    @UseGuards(CronSecretGuard)
    async procesarRecordatorios()
    {
        return await this.notificacionesService.procesarRecordatoriosPendientes();
    }

    @Patch('fecha-programada/:idPedido')
    async modificarFechaProgramada(@Param('idPedido', ParseIntPipe) idPedido:number, @Query('plantilla') plantilla: string)
    {
        this.notificacionesService.modificarFechaProgramada(idPedido, plantilla)
    }
}