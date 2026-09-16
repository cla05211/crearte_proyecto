import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, filter, take, throwError, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../app/services/Auth/auth-service';
import { ClientesAuthService } from '../app/services/clientes-auth-service/clientes-auth-service';

let refrescandoToken = false;

const tokenRefrescado$ = new BehaviorSubject<string | null>(null);

// Rutas que hablan con la sesión de CLIENTE (token opaco en sesiones_clientes),
// nunca con la sesión de staff (Supabase Auth). Si agregás un controller de
// cliente nuevo, acordate de sumarlo acá.
//
// /pagos/ocr también entra acá: es el endpoint de OCR de comprobantes, hoy
// sin guard propio (lo usa tanto ventas como, ahora, cuenta corriente del
// cliente), así que no tiene sentido mandarle un token de staff que el
// cliente ni tiene. Si en algún momento se le agrega auth a ese endpoint,
// tiene que poder validar sesión de cliente.
const esRutaCliente = (url: string): boolean =>
  url.includes('/clientes-auth') || url.includes('/clientes-portal') || url.includes('/pagos/ocr');

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const clientesAuthService = inject(ClientesAuthService);
  const router = inject(Router);

  const esCliente = esRutaCliente(req.url);
  const token = esCliente
    ? localStorage.getItem('cliente_token')
    : localStorage.getItem('access_token');

  const req2 = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(req2).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401)
      {
        return throwError(() => error);
      }

      // Login de cliente: un 401 acá es credenciales mal escritas, no una
      // sesión vencida. Que el componente de login lo maneje como siempre.
      if (req.url.includes('/clientes-auth'))
      {
        return throwError(() => error);
      }

      // Resto de rutas de cliente (portal y OCR): la sesión de cliente es un
      // token opaco sin refresh — si vuelve 401 es porque venció o es
      // inválido, así que se cierra directo y se manda a su propio login.
      // Importante: nunca tocar la sesión de STAFF acá.
      if (esCliente)
      {
        clientesAuthService.cerrarSesion();
        router.navigate(['/login-clientes']);
        return throwError(() => error);
      }

      const esRutaAuthStaff = req.url.includes('/auth/refresh') || req.url.includes('/auth/login');

      if (esRutaAuthStaff)
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
