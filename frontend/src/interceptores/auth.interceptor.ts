import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, filter, take, throwError, BehaviorSubject } from 'rxjs';
import { AuthService } from '../app/services/Auth/auth-service';

let refrescandoToken = false;

const tokenRefrescado$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = localStorage.getItem('access_token');

  const req2 = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(req2).pipe(
    catchError((error: HttpErrorResponse) => {
      const esRutaAuth = req.url.includes('/auth/refresh') || req.url.includes('/auth/login');

      if (error.status !== 401 || esRutaAuth) 
      {
        return throwError(() => error);
      }

      if (!refrescandoToken) {
        refrescandoToken = true;
        tokenRefrescado$.next(null);

        return authService.refrescarToken().pipe(
          switchMap(() => {
            refrescandoToken = false;
            const nuevoToken = localStorage.getItem('access_token');
            tokenRefrescado$.next(nuevoToken);

            const reqConTokenNuevo = req.clone({
              setHeaders: { Authorization: `Bearer ${nuevoToken}` }
            });
            return next(reqConTokenNuevo);
          }),
          catchError((errRefresh) => {
            refrescandoToken = false;
            authService.cerrarSesion();
            return throwError(() => errRefresh);
          })
        );
      } 
      else 
      {
        return tokenRefrescado$.pipe(
          filter(token => token !== null),
          take(1),
          switchMap(nuevoToken => {
            const reqConTokenNuevo = req.clone({
              setHeaders: { Authorization: `Bearer ${nuevoToken}` }
            });
            return next(reqConTokenNuevo);
          })
        );
      }
    })
  );
};