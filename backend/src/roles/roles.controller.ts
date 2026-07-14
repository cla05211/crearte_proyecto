import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
