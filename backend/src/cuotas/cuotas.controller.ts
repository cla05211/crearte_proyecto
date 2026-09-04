import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { CuotasService } from './cuotas.service';
import { ModificarImporteCuotasDTO } from './dto/ModificarImporteCuotas';
import { CuotaDTO } from './dto/cuota.dto';
import { crearCuotasDTO } from './dto/crearCuotas.dto';
import { PagarCuotaDTO } from './dto/PagarCuota.dto';
import { ModificarImporteCuotaDTO } from './dto/ModificarImporteCuota';

@Controller('cuotas')
export class CuotasController 
{
    constructor(private cuotasService: CuotasService){}

    @Post()
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async crearProductosPedido(@Body() dto: crearCuotasDTO)
    {
        return await this.cuotasService.crearCuotas(dto);
    }

    @Get ('pendientes/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async obtenerCuotasPendientesIdPedido(@Param ('id', ParseIntPipe) id:number)
    {
        return await this.cuotasService.traerCuotasPendientesPorIdPedido(id);
    }

    @Get (':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async obtenerCuotasIdPedido(@Param ('id', ParseIntPipe) id:number)
    {
        return await this.cuotasService.traerCuotasPorIdPedido(id);
    }
    
    @Get ('')
    @UseGuards(AuthGuard,PermisosGuard)
    async traerIdCuota(@Query('idPedido') idPedido: number, @Query('nroCuota') nroCuota: number )
    {
        return await this.cuotasService.traerIdCuota(idPedido, nroCuota);
    }

    @Patch('importe-cuotas')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    modificarImporteCuotasPedido(@Body() dto: ModificarImporteCuotasDTO)
    {
        return this.cuotasService.modificarImporteCuotasPendientesPedido(dto);
    }   

    
    @Patch('importe-cuota')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    modificarImporteUnaCuotaPedido(@Body() dto: ModificarImporteCuotaDTO)
    {
        return this.cuotasService.modificarImporteUnaCuotaPedido(dto);
    }   

    @Patch('pagar')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    pagarCuotasPedido(@Body() dto: PagarCuotaDTO)
    {
        return this.cuotasService.pagarCuotaPuntual(dto);
    }   

    @Patch('vencimiento/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    modificarVencimientoCuota(@Query('vencimiento') vencimiento: string, @Param('id',ParseIntPipe) id:number)
    {
        return this.cuotasService.modificarFechaVencimientoCuota(id, vencimiento);
    }   
 

    @Delete('/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async eliminarCuotasPedido(@Param('id', ParseIntPipe)idPedido: number)
    {
        return await this.cuotasService.eliminarCuotasPedido(idPedido);
    }
}

