import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ClientesAuthService } from './clientes-auth-service.service';
import { LoginClienteDto } from './dto/loginCliente.dto';
import { CrearContrasenaDto } from './dto/crearContrasena.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';

@Controller('clientes-auth')
export class ClientesAuthController
{
    constructor(private clientesAuth: ClientesAuthService){}

    @Post('login')
    async iniciarSesion(@Body() body: LoginClienteDto)
    {
        return await this.clientesAuth.iniciarSesion(body.usuario, body.contraseña);
    }

    @Get('activacion/:token')
    async validarTokenActivacion(@Param('token') token: string)
    {
        return await this.clientesAuth.validarTokenActivacion(token);
    }

    @Post('crear-contrasena')
    async crearContrasena(@Body() body: CrearContrasenaDto)
    {
        return await this.clientesAuth.crearContrasena(body.token, body.contraseña);
    }

    @Post('grupos/:idGrupo/link-activacion')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async generarLinkActivacion(@Param('idGrupo', ParseIntPipe) idGrupo: number)
    {
        return await this.clientesAuth.generarLinkActivacion(idGrupo);
    }

    @Get('test-token/:idGrupo')
probar(@Param('idGrupo') idGrupo: number) {
  return this.clientesAuth.generarLinkActivacion(idGrupo);
}
}
