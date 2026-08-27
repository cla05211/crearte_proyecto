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
        path: "bancos",
        loadComponent: () => import('./pages/bancos/bancos').then((archivo) => archivo.Bancos),
        canActivate: [PermisosGuard],
        data: { permiso: 'ver_bancos' }
      },
      {
        path: "movimientos-caja",
        loadComponent: () => import('./pages/movimientos-caja/movimientos-caja').then((archivo) => archivo.MovimientosCaja),
        canActivate: [PermisosGuard],
        data: { permiso: 'ver_caja' }
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
      {
        path: "clientes",
        loadComponent: () => import('./pages/clientes/clientes').then((archivo) => archivo.Clientes),
        canActivate: [PermisosGuard],
        data: { permiso: 'ver_clientes' },
      },
      {
        path: "clientes/:id",
        loadComponent: () => import('./pages/clientes/colegio-detalle/colegio-detalle').then((archivo) => archivo.ColegioDetalle),
        canActivate: [PermisosGuard],
        data: { permiso: 'ver_clientes' },
        children: [
          { path: '', redirectTo: 'datos', pathMatch: 'full' },
          {
            path: "datos",
            loadComponent: () => import('./pages/clientes/colegio-detalle/datos/datos').then((archivo) => archivo.Datos),
            canActivate: [PermisosGuard],
            data: { permiso: 'ver_clientes_datos' },
          },
          {
            path: "presupuesto",
            loadComponent: () => import('./pages/clientes/colegio-detalle/presupuesto/presupuesto').then((archivo) => archivo.Presupuesto),
            canActivate: [PermisosGuard],
            data: { permiso: 'ver_clientes_presupuesto' },
          },
          {
            path: "administrativo",
            loadComponent: () => import('./pages/clientes/colegio-detalle/administrativo/administrativo').then((archivo) => archivo.Administrativo),
            canActivate: [PermisosGuard],
            data: { permiso: 'ver_clientes_administrativo' },
          },
          {
            path: "talles-diseño",
            loadComponent: () => import('./pages/clientes/colegio-detalle/talles-disenio/talles-disenio').then((archivo) => archivo.TallesDisenio),
            canActivate: [PermisosGuard],
            data: { permiso: 'ver_clientes_talles_disenio' },
          }
        ]
      },
      { path: "", redirectTo: "home", pathMatch: 'full' },
    ]
  },
];