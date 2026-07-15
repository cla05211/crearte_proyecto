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
        const permisoRequerido = this.reflector.get<string>(PERMISO_KEY, context.getHandler());

        if(!permisoRequerido)
        {
            return true; 
        }

        const request = context.switchToHttp().getRequest();
        const usuario = request.usuario;

        if(!usuario)
        {
            throw new ForbiddenException('No se pudo determinar el usuario');
        }

        const tienePermiso = await this.permisosService.tienePermiso(usuario.rol, permisoRequerido);

        if(!tienePermiso)
        {
            throw new ForbiddenException('No tenés permiso para realizar esta acción');
        }

        return true;
    }
}