import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {LoginDto} from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';

@Controller('auth')
export class AuthController 
{
    constructor(private auth: AuthService){}

    @Post('login')
    async login(@Body() body: LoginDto)
    {
        return await this.auth.iniciarSesion(body.correo, body.contraseña)
    } 

    @Post('registro')
    async registrar(@Body() body: RegistroDto)
    {
        return await this.auth.registrar(body)
    }
}
