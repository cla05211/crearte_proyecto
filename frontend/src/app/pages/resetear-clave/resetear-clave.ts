import { Component } from '@angular/core';
import { AuthService } from '../../services/Auth/auth-service';
import { Inject,inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../shared/notifications/notification.service';

@Component({
  selector: 'app-resetear-clave',
  imports: [],
  templateUrl: './resetear-clave.html',
  styleUrl: './resetear-clave.css',
})
export class ResetearClave 
{
  auth = inject(AuthService);
  notificaciones = inject(NotificationService);

  async resetearClave(nuevaClave:string)
  {
    try 
    {
      const hash = window.location.hash;

      const params = new URLSearchParams(hash.substring(1));

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if(!accessToken || !refreshToken)
      {
        throw new Error('Token de recuperación inválido');
      }

      const data:any = await firstValueFrom(this.auth.resetearClave(nuevaClave, accessToken, refreshToken));

      if(data.mensaje)
      {
        this.notificaciones.success({
          title: 'Contraseña restablecida',
          description: 'La contraseña se ha cambiado correctamente.'
        });
      }

    }
    catch(error:any)
    {
      this.notificaciones.error({
        title: 'Error',
        description: error.error?.message ?? 'No se pudo cambiar la contraseña.'
      });
    }
}
}