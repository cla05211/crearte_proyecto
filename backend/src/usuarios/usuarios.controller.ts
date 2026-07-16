import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { Req } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController 
{
    constructor(private usuariosService: UsuariosService){}

    @Get('')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_usuarios')
    async obtenerUsuarios(@Req() req: any) 
    {
        return this.usuariosService.obtenerUsuarios();
    }

    @Delete(':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_usuarios')
    async eliminarUsuario(@Param('id')id: number)
    {
        return this.usuariosService.eliminarUsuario(id);
    }
}
