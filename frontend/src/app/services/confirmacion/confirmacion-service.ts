import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfirmationService 
{

  confirmar(
    titulo: string,
    descripcion: string
  ): Promise<boolean> {

    return new Promise(resolve => {

    });
  }
}
