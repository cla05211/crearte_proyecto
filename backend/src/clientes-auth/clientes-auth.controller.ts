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

    // Público: lo usa la página /crear-contrasena/:token antes de mostrar el formulario.
    @Get('activacion/:token')
    async validarTokenActivacion(@Param('token') token: string)
    {
        return await this.clientesAuth.validarTokenActivacion(token);
    }

    // Público: el token del link es lo que autoriza.
    @Post('crear-contrasena')
    async crearContrasena(@Body() body: CrearContrasenaDto)
    {
        return await this.clientesAuth.crearContrasena(body.token, body.contraseña);
    }

    // Solo personal: genera (o regenera) el link de activación del cliente de un grupo.
    // Sirve para probar mientras no está el envío por WhatsApp, y para "reenviar link".
    @Post('grupos/:idGrupo/link-activacion')
    @UseGuards(AuthGuard, PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async generarLinkActivacion(@Param('idGrupo', ParseIntPipe) idGrupo: number)
    {
        return await this.clientesAuth.generarLinkActivacion(idGrupo);
    }
}
