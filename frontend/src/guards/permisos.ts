import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

export const PermisosGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');
  if (!token) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};