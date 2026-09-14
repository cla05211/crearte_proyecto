import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ClientesAuthService } from './clientes-auth-service.service';

@Controller('clientes-auth')
export class ClientesAuthController 
{
    constructor(private clientesAuth: ClientesAuthService){}

    @Get()
    iniciarSesion(@Query('nombreUsuario')nombreUsuario:string, @Query('contrasena')contrasena:string)
    {
        return this.clientesAuth.iniciarSesion(nombreUsuario, contrasena);
    }
}
