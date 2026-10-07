import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { CronSecretGuard } from './guards/cronSecret.guard';

@Controller('notificaciones')
export class NotificacionesController
{
    constructor(private notificacionesService: NotificacionesService) {}

    // Lo llama pg_cron (vía pg_net) una vez por día
    @Post('procesar-recordatorios')
    @HttpCode(200)
    @UseGuards(CronSecretGuard)
    async procesarRecordatorios()
    {
        return await this.notificacionesService.procesarRecordatoriosPendientes();
    }
}
