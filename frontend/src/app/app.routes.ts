import { Routes } from '@angular/router';
import { LogueadoGuard } from '../guards/logueado';
import { PermisosGuard } from '../guards/permisos';

export const routes: Routes = [
  // ---- Rutas públicas (sin navbar/sidebar) ----
  { path: "login", loadComponent: () => import('./pages/login/login').then((archivo) => archivo.Login) },
  { path: "registro", loadComponent: () => import('./pages/registro/registro').then((archivo) => archivo.Registro) },
  { path: "olvido-clave", loadComponent: () => import('./pages/olvido-clave/olvido-clave').then((archivo) => archivo.OlvidoClave) },
  { path: "resetear-clave", loadComponent: () => import('./pages/resetear-clave/resetear-clave').then((archivo) => archivo.ResetearClave) },

  // ---- Rutas privadas (con Shell: navbar + sidebar) ----
  {
    path: "",
    loadComponent: () => import('./shell/shell').then((archivo) => archivo.Shell),
    canActivate: [LogueadoGuard],
    children: [
      { path: "home", loadComponent: () => import('./pages/home/home').then((archivo) => archivo.Home) },
       { path: "pruebas", loadComponent: () => import('./pages/pruebas-pagos/pruebas-pagos').then((archivo) => archivo.PruebasPagos) },
      {
        path: "usuarios",
        loadComponent: () => import('./pages/usuarios/usuarios').then((archivo) => archivo.Usuarios),
        canActivate: [PermisosGuard],
        data: { permiso: 'ver_usuarios' }
      },
      {
        path: "productos",
        loadComponent: () => import('./pages/productos/productos').then((archivo) => archivo.Productos),
        canActivate: [PermisosGuard],
        data: { permiso: 'ver_productos' }
      },
      {
        path: "ventas",
        loadComponent: () => import('./pages/ventas/ventas').then((archivo) => archivo.Ventas),
        canActivate: [PermisosGuard],
        data: { permiso: 'crear_pedido' }
      },
      { path: "", redirectTo: "home", pathMatch: 'full' },
    ]
  },
];