import { Component } from '@angular/core';
import { Inject, inject } from '@angular/core';
import { AuthService } from '../../services/Auth/auth-service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home 
{
  auth = inject(AuthService)
  notificaciones = inject(NotificationService)

  async cerrarSesion()
  {
    try
    {
      await firstValueFrom(this.auth.cerrarSesion());
    }
    catch (err: any) 
    {
        const code = err?.error?.code; //Este es el data.error del back
        const mensaje = err?.error?.message;

        if (code === 'SIGNOUT_ERROR')
        {
            this.notificaciones.warning({
                title: 'Usuario no registrado',
                description: mensaje,
            });
        }
    }
  }
}
