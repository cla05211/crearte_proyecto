import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermisosService } from '../permisos.service';
import { PERMISO_KEY } from '../requiere_permismos.decorator';

@Injectable()
export class PermisosGuard implements CanActivate 
{
    constructor(private reflector: Reflector, private permisosService: PermisosService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> 
    {
        const permisosRequeridos = this.reflector.get<string[]>(PERMISO_KEY, context.getHandler());

        if(!permisosRequeridos?.length)
        {
            return true; 
        }

        const request = context.switchToHttp().getRequest();
        const usuario = request.usuario;

        if(!usuario)
        {
            throw new ForbiddenException('No se pudo determinar el usuario');
        }

        // Alcanza con tener uno de los permisos indicados en @RequierePermiso
        const permisosRol = await this.permisosService.obtenerPermisosRol(usuario.rol);
        const tienePermiso = permisosRequeridos.some(permiso => permisosRol.includes(permiso));

        if(!tienePermiso)
        {
            throw new ForbiddenException('No tenés permiso para realizar esta acción');
        }

        return true;
    }
}