import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { MuestrasFisicasService } from './muestras-fisicas.service';

@Controller('muestras-fisicas')
export class MuestrasFisicasController 
{
    constructor(private muestrasFisicasService: MuestrasFisicasService){}

    @Get('')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_tabla_muestras_fisicas')
    async traerMuestrasTabla()
    {
        return this.muestrasFisicasService.traerMuestras();
    }

    @Patch('muestras/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_tabla_muestras_fisicas')
    async modificarMuestras(@Param('id')id: number, @Query('muestras') muestras: string)
    {
        return this.muestrasFisicasService.modificarMuestras(muestras, id);
    }

    @Patch('muestras/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_tabla_muestras_fisicas')
    async modificarEstado(@Param('id')id: number, @Query('estado') estado: string)
    {
        return this.muestrasFisicasService.modificarMuestras(estado, id);
    }

    @Patch('fecha-entrega/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_tabla_muestras_fisicas')
    async modificarFechaEntrega(@Param('id')id: number, @Query('fechaEntrega') fechaEntrega: string)
    {
        return this.muestrasFisicasService.modificarFechaEntrega(fechaEntrega, id);
    }

    @Patch('fecha-devolucion/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_tabla_muestras_fisicas')
    async modificarFechaDevolucion(@Param('id')id: number, @Query('fechaDevolucion') fechaDevolucion: string)
    {
        return this.muestrasFisicasService.modificarFechaDevolucion(fechaDevolucion, id);
    }
}
