import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController 
{
    constructor(private rolesService: RolesService){}

    @Get()
    async obtenerRoles()
    {
        return await this.rolesService.obtenerRoles();
    }

    @Get('nro/:nroRol')
    async obtenerRolPorNro(@Param('nroRol')nroRol: number)
    {
        return await this.rolesService.obtenerRolPorNumero(nroRol);
    }
}
