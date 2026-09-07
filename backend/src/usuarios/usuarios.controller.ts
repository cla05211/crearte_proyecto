import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { Req } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { ModificarAprobacionDTO } from './dto/modificarAprobacion.dto';

@Controller('usuarios')
export class UsuariosController 
{
    constructor(private usuariosService: UsuariosService){}

    @Get('')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_usuarios')
    async obtenerUsuarios(@Query('rol') rol?: number) 
    {
        return this.usuariosService.obtenerUsuarios(rol);
    }

    @Get(':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_caja')
    async obtenerUsuarioPorId(@Param('id')id: number) 
    {
        return this.usuariosService.obtenerUsuarioPorId(id);
    }

    @Post('aprobacion')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_usuarios')
    async modificarAprobacion(@Body() dto: ModificarAprobacionDTO)
    {
        return this.usuariosService.modificarAprobado(dto.id, dto.aprobado);
    }

    @Delete(':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_usuarios')
    async eliminarUsuario(@Param('id')id: number)
    {
        return this.usuariosService.eliminarUsuario(id);
    }
}
