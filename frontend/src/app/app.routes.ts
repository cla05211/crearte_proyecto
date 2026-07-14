import { Routes } from '@angular/router';
import { LogueadoGuard } from '../guards/logueado';

export const routes: Routes = 
[
     {path: "login", loadComponent: ()=> import ('./pages/login/login') .then ((archivo) => archivo.Login)},
     {path: "registro", loadComponent: ()=> import ('./pages/registro/registro') .then ((archivo) => archivo.Registro)},
     {path: "home", loadComponent: ()=> import ('./pages/home/home') .then ((archivo) => archivo.Home), canActivate: [LogueadoGuard]},
     {path: "", redirectTo: "home", pathMatch: 'full'},
];
