import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {LoginDto} from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { AuthGuard } from './guards/auth.guard';
import { ResetearClaveDto } from './dto/resetearClave.dto';

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

    @Post('salir')
    async cerrarSesion()
    {
        return await this.auth.cerrarSesion();
    }

    @Get('perfil')
    @UseGuards(AuthGuard)
    async obtenerPerfil(@Req() req: any) 
    {
        return req.user.email; 
    }

    @Post('olvido-clave/:correo')
    async enviarEnlaceClave(@Param('correo')correo: string)
    {
        return this.auth.enviarEnlaceClave(correo);
    }

    @Post('resetear-clave')
    async resetearClave(@Body() dto:ResetearClaveDto)
    {
        return this.auth.resetearClave(dto);
    }


}
