import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {LoginDto} from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { AuthGuard } from './guards/auth.guard';

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

    @Get('perfil')
    @UseGuards(AuthGuard)
    async obtenerPerfil(@Req() req: any) 
    {
        return req.user.email; 
    }

}
