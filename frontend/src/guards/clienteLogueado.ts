import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const ClienteLogueadoGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('cliente_token');
  if (!token) {
    router.navigate(['/login-clientes']);
    return false;
  }
  return true;
};
