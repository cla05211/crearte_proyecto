import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { ProductosService } from './productos.service';
import { ProductoPostDTO } from './dto/ProductoPOST.dto';
import { AgregadoPostDTO } from './dto/AgregadoPost.dto';

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
    async obtenerAgregados(@Req() req: any) 
    {
        return await this.productosService.obtenerAgregados();
    }  

    @Get('/precio-beneficio')
    @UseGuards(AuthGuard,PermisosGuard)
    async obtenerPrecioBeneficio(@Query('idProducto') idProducto: number, @Query('cantidad') cantidad: number, @Query('cuotas') cuotas: number,) 
    {
        return await this.productosService.obtenerPreciosBeneficios(idProducto, cantidad, cuotas);
    }  

    @Post ('')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_productos')
    async agregarProducto(@Body() dto: ProductoPostDTO)
    {
        return await this.productosService.agregarProductoPrecio(dto);
    }

    @Post ('/agregado')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_productos')
    async agregarAgregado(@Body() dto: AgregadoPostDTO)
    {
        return await this.productosService.agregarAgregado(dto);
    }

    @Get('/cuotas-disponibles')
    @UseGuards(AuthGuard,PermisosGuard)
    async obtenerCuotasDisponibles() 
    {
        return await this.productosService.obtenerCuotasDisponibles();
    }  
}

