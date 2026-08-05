import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { CuotasService } from './cuotas.service';
import { ModificarImporteCuotaDTO } from './dto/ModificarImporteCuota';

@Controller('cuotas')
export class CuotasController 
{
    constructor(private cuotasService: CuotasService){}

    @Get (':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modficar_pedidos')
    async obtenerCuotasIdPedido(@Param ('id', ParseIntPipe) id:number)
    {
        return await this.cuotasService.traerCuotasPendientesPorIdPedido(id);
    }

    @Patch('importe')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    modificarImporteCuotasPedido(@Body() dto: ModificarImporteCuotaDTO)
    {
        return this.cuotasService.modificarImporteCuotasPendientesPedido(dto);
    }   
}
