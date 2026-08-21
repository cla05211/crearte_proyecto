import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { MovimientoCajaDTO } from './dto/movimientoCaja.dto copy';
import { MovimientosCajaService } from './movimientos-caja.service';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { MovimientoCajaResponseDTO } from './dto/movimientoCajaResponse.dto';

@Controller('movimientos-caja')
export class MovimientosCajaController 
{
    constructor(private movimientosCajaService: MovimientosCajaService){}

    @Post('')
    @UseGuards(AuthGuard)
    @RequierePermiso('ver_caja')
    async agregarMovimiento(@Body() dto: MovimientoCajaDTO):Promise<number>
    {
        return await this.movimientosCajaService.crearMovimiento(dto);
    }
    
    @Get ('')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_caja')
    async obtenerPedidosVentas(@Query('rangoDesde', ParseIntPipe) rangoDesde: number, @Query('rangoHasta', ParseIntPipe) rangoHasta: number, @Query('busqueda') busqueda?: string, @Query('tipo') tipo?: string, @Query('categoria') categoria?: string):Promise<MovimientoCajaResponseDTO[]>
    {
        return await this.movimientosCajaService.traerMovimientosBusqueda(rangoDesde, rangoHasta, busqueda, tipo, categoria);
    }

    @Get('/ingresos')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_bancos')
    async obtenerTotalIngresos()
    {
        return await this.movimientosCajaService.obtenerTotalIngresos();
    }

    @Get('/egresos')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_bancos')
    async obtenerTotalEgresos()
    {
        return await this.movimientosCajaService.obtenerTotalEgresos();
    }

    @Delete(':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_caja')
    async eliminarMovimiento(@Param('id')id: number)
    {
        return this.movimientosCajaService.eliminarMovimiento(id);
    }
}
