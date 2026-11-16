import { Body, Controller, Delete, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { ProductosService } from './productos.service';
import { ProductoPostDTO } from './dto/ProductoPOST.dto';
import { AgregadoPostDTO } from './dto/AgregadoPost.dto';
import { ModificarProductoPreciosDTO } from './dto/ModificarProductoPrecios.dto';
import { AgregarPlanDTO } from './dto/AgregarPlanDTO';
import { TramoBeneficiosDTO } from './dto/BeneficioTramo.dto';

@Controller('productos')
export class ProductosController 
{
    constructor(private productosService: ProductosService){}

    @Get('')
    @UseGuards(AuthGuard,PermisosGuard)
    async obtenerUsuarios(@Req() req: any) 
    {
        return await this.productosService.obtenerProductos();
    }  

    @Get('/agregados')
    @UseGuards(AuthGuard,PermisosGuard)
    // idGrupo opcional: con él, los precios vigentes a la fecha de venta del grupo (edición de presupuesto)
    async obtenerAgregados(@Query('idGrupo', new ParseIntPipe({ optional: true })) idGrupo?: number) 
    {
        const fecha = idGrupo ? await this.productosService.obtenerFechaVentaGrupo(idGrupo) : undefined;
        return await this.productosService.obtenerAgregados(fecha);
    }  

    @Get('/precio-beneficio')
    @UseGuards(AuthGuard,PermisosGuard)
    // idGrupo opcional: con él, los precios vigentes a la fecha de venta del grupo (edición de presupuesto)
    async obtenerPrecioBeneficio(@Query('idProducto', ParseIntPipe) idProducto: number, @Query('cantidad', ParseIntPipe) cantidad: number, @Query('cuotas',ParseIntPipe) cuotas: number, @Query('conSenia', new ParseBoolPipe({ optional: true })) conSenia?: boolean, @Query('idGrupo', new ParseIntPipe({ optional: true })) idGrupo?: number) 
    {
        const fecha = idGrupo ? await this.productosService.obtenerFechaVentaGrupo(idGrupo) : undefined;
        return await this.productosService.obtenerPreciosBeneficios(idProducto, cantidad, cuotas, conSenia, fecha);
    }  

    @Get('precios')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_presupuesto')
    async obtenerPreciosId(@Query('idProducto', ParseIntPipe) idProducto: number, @Query('cuotas', ParseIntPipe) cuotas: number, @Query('cantidad', ParseIntPipe) cantidad: number, @Query('fecha') fecha: string,@Query('conSenia', new ParseBoolPipe({ optional: true })) conSenia?: boolean)
    {
        return await this.productosService.obtenerPreciosId(idProducto, cuotas, cantidad,fecha, conSenia);
    }

    @Post ('')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_pagina_productos')
    async agregarProducto(@Body() dto: ProductoPostDTO)
    {
        return await this.productosService.agregarProductoPrecio(dto);
    }

    @Post ('/agregado')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_pagina_productos')
    async agregarAgregado(@Body() dto: AgregadoPostDTO)
    {
        return await this.productosService.agregarAgregado(dto);
    }

    @Get('/planes-disponibles')
    @UseGuards(AuthGuard,PermisosGuard)
    async obtenerPlanesDisponibles() 
    {
        return await this.productosService.obtenerPlanesDisponibles();
    }  

    //Productos

    @Patch('/precios')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_pagina_productos')
    async modificarPreciosProducto(@Query('idProducto', ParseIntPipe) idProducto: number, @Body() dto: ModificarProductoPreciosDTO[])
    {
        return await this.productosService.modificarPreciosProducto(idProducto,dto)
    }
    
    // Beneficios de cada tramo del producto (se aplican a todos los planes)
    @Patch('/beneficios')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_pagina_productos')
    async modificarBeneficiosProducto(@Query('idProducto', ParseIntPipe) idProducto: number, @Body() dto: TramoBeneficiosDTO[])
    {
        return await this.productosService.modificarBeneficiosProducto(idProducto, dto);
    }

    @Patch('/activar-plan')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_pagina_productos')
    async activarPlan(@Query('cuotas', ParseIntPipe) cuotas: number,@Query('senia', ParseBoolPipe) senia: boolean,@Query('activo', ParseBoolPipe) activo: boolean)
    {
        return await this.productosService.activarDesactivarPlan(cuotas,senia,activo)
    }

    @Post ('/plan')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_pagina_productos')
    async agregarPlan(@Body() dto: AgregarPlanDTO)
    {
        return await this.productosService.agregarPlan(dto);
    }
}

