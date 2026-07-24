import { Routes } from '@angular/router';
import { LogueadoGuard } from '../guards/logueado';
import { PermisosGuard } from '../guards/permisos';

export const routes: Routes = 
[
     {path: "login", loadComponent: ()=> import ('./pages/login/login') .then ((archivo) => archivo.Login)},
     {path: "registro", loadComponent: ()=> import ('./pages/registro/registro') .then ((archivo) => archivo.Registro)},
     {path: "home", loadComponent: ()=> import ('./pages/home/home') .then ((archivo) => archivo.Home), canActivate: [LogueadoGuard]},
     {path: "usuarios", loadComponent: ()=> import ('./pages/usuarios/usuarios') .then ((archivo) => archivo.Usuarios), canActivate: [LogueadoGuard, PermisosGuard], data: {permiso: 'ver_usuarios'}},
     {path: "productos", loadComponent: ()=> import ('./pages/productos/productos') .then ((archivo) => archivo.Productos), canActivate: [LogueadoGuard, PermisosGuard], data: {permiso: 'ver_productos'}},
     {path: "olvido-clave", loadComponent: ()=> import ('./pages/olvido-clave/olvido-clave') .then ((archivo) => archivo.OlvidoClave)},
     {path: "resetear-clave", loadComponent: ()=> import ('./pages/resetear-clave/resetear-clave') .then ((archivo) => archivo.ResetearClave)},
     {path: "", redirectTo: "home", pathMatch: 'full'},
];
