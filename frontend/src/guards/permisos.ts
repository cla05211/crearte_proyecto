import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../app/services/Auth/auth-service';
import { PermisosService } from '../app/services/permisos/permisos';

export const PermisosGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const permisosService = inject(PermisosService);

  const permisoRequerido = route.data['permiso'] as string;
  if (permisoRequerido && !permisosService.tienePermiso(permisoRequerido)) 
  {
    router.navigate(['/home']);
    return false;
  }

  return true;
};