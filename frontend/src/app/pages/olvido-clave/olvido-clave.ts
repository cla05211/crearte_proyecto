import { Component } from '@angular/core';
import { AuthService } from '../../services/Auth/auth-service';
import { Inject, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../shared/notifications/notification.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-olvido-clave',
  imports: [RouterLink],
  templateUrl: './olvido-clave.html',
  styleUrl: './olvido-clave.css',
})
export class OlvidoClave 
{
  auth = inject(AuthService);
  notificaciones = inject(NotificationService)
  router = inject (Router)

  async resetearClave(correo:string)
  {
    try 
    {
      const data: any = await firstValueFrom(this.auth.resetearClave(correo));

      if(data.mensaje)
      {
        this.notificaciones.success({
          title: 'Enlace enviado',
          description: 'Se ha enviado un enlace para restablecer la contraseña al correo ingresado.',
        });
      }
    }
    catch(error: any)
    {
      this.notificaciones.error({
        title: 'Error',
        description: error.error?.message ?? 'No se pudo enviar el enlace.',
      });
    }
  }
}
