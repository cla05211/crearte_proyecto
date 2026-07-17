import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationContainer } from './shared/notifications/notification-container';
import { ConfirmationDialog } from './services/confirmation/confirmation-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationContainer, ConfirmationDialog],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
