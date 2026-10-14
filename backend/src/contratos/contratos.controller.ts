import { Controller, Get, Param, ParseIntPipe, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { ContratosService } from './contratos.service';

@Controller('contratos')
export class ContratosController
{
    constructor(private contratosService: ContratosService) {}

    // PDF del contrato armado desde la base, con las firmas de los padres que ya firmaron
    @Get(':idGrupo')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_clientes_administrativo')
    async obtenerContrato(@Param('idGrupo', ParseIntPipe) idGrupo: number, @Res() res: Response)
    {
        const buffer = await this.contratosService.generarPdfContrato(idGrupo);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="contrato-${idGrupo}.pdf"`,
        });
        res.send(buffer);
    }
}
