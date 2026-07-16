import { importProvidersFrom, Injectable } from '@angular/core';
import { Permiso } from '../../../interfaces/permiso';

@Injectable({
  providedIn: 'root',
})
export class PermisosService 
{
    private permisos: string[] = [];

    guardarPermisos(permisos: string[]) 
    {
        this.permisos = permisos;
        localStorage.setItem('permisos', JSON.stringify(permisos));
    }


    cargarPermisos(): string[] 
    {
        if (this.permisos.length === 0) 
        {
            const guardados = localStorage.getItem('permisos');
            if (guardados) 
            {
            this.permisos = JSON.parse(guardados);
            }
        }
        return this.permisos;
    }

    tienePermiso(nombre: string): boolean 
    {
        return this.cargarPermisos().includes(nombre);
    }

    limpiar() 
    {
        this.permisos = [];
        localStorage.removeItem('permisos');
    }
}
