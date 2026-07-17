import { Component, inject } from '@angular/core';
import { ConfirmationService } from './confirmation.service';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.css',
})
export class ConfirmationDialog {
  protected readonly confirmationService = inject(ConfirmationService);

  protected close(confirmed: boolean): void {
    this.confirmationService.resolve(confirmed);
  }

  protected closeFromOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close(false);
    }
  }
}
