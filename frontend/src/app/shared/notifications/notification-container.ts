import { Component, inject } from '@angular/core';
import { NotificationService, type AppNotification } from './notification.service';

@Component({
  selector: 'app-notification-container',
  templateUrl: './notification-container.html',
  styleUrl: './notification-container.css',
})
export class NotificationContainer {
  protected readonly notificationService = inject(NotificationService);

  protected dismiss(id: number): void {
    this.notificationService.dismiss(id);
  }

  protected iconLabel(notification: AppNotification): string {
    const labels = {
      success: 'Éxito',
      error: 'Error',
      warning: 'Advertencia',
      info: 'Información',
    };

    return labels[notification.type];
  }
}
