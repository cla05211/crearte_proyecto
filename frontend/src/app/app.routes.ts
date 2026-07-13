import { Routes } from '@angular/router';


export const routes: Routes = 
[
     {path: "login", loadComponent: ()=> import ('./pages/login/login') .then ((archivo) => archivo.Login)},
     {path: "home", loadComponent: ()=> import ('./pages/home/home') .then ((archivo) => archivo.Home)},
];
