import { Component, signal } from '@angular/core';
import { Inject, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationContainer } from './shared/notifications/notification-container';
import { ConfirmationDialog } from './services/confirmation/confirmation-dialog';
import { AuthService} from './services/Auth/auth-service';
import { NotificationService } from './shared/notifications/notification.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationContainer, ConfirmationDialog],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
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
                title: 'Error al cerrar',
                description: mensaje,
            });
        }
    }
  }
}
