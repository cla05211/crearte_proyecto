import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AgregadosService } from './agregados.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { ModificarAgregadoPrecioDTO } from './dto/ModificarAgregadoPrecio.dto';

@Controller('agregados')
export class AgregadosController {
  constructor(private readonly agregadosService: AgregadosService) {}
  
    @Get('')
    @UseGuards(AuthGuard, PermisosGuard)
    async obtenerAgregados()
    {
        return await this.agregadosService.obtenerAgregados();
    }

    @Patch('/precios')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('ver_pagina_productos')
    async modificarPrecios(@Body() dto: ModificarAgregadoPrecioDTO[])
    {
        return await this.agregadosService.modificarPrecios(dto);
    }

}
