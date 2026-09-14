import { Body, Controller, Post } from '@nestjs/common';
import { ClientesAuthService } from './clientes-auth-service.service';
import { LoginClienteDto } from './dto/loginCliente.dto';

@Controller('clientes-auth')
export class ClientesAuthController
{
    constructor(private clientesAuth: ClientesAuthService){}

    @Post('login')
    async iniciarSesion(@Body() body: LoginClienteDto)
    {
        return await this.clientesAuth.iniciarSesion(body.usuario, body.contraseña);
    }
}
