import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
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
        return this.productosService.obtenerProductos();
    }  

    @Get('/agregados')
    @UseGuards(AuthGuard,PermisosGuard)
    async obtenerAgregados(@Req() req: any) 
    {
        return this.productosService.obtenerAgregados();
    }  

    @Post ('')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_productos')
    async agregarProducto(@Body() dto: ProductoPostDTO)
    {
        this.productosService.agregarProducto(dto);
    }

    @Post ('/agregado')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_productos')
    async agregarAgregado(@Body() dto: AgregadoPostDTO)
    {
        this.productosService.agregarAgregado(dto);
    }

    @Delete ('/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_productos')
    async eliminarProducto(@Param('id')id: number)
    {
        return this.productosService.eliminarProducto(id);
    }

    @Delete ('/agregado/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_productos')
    async eliminarAgregado(@Param('id')id: number)
    {
        return this.productosService.eliminarAgregado(id);
    }
}

