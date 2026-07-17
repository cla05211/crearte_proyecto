import { Injectable, signal } from '@angular/core';

export interface ConfirmationOptions {
  title: string;
  description: string;
}

export interface ConfirmationRequest extends ConfirmationOptions {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  readonly currentConfirmation = signal<ConfirmationRequest | null>(null);

  private nextId = 0;
  private resolver: ((confirmed: boolean) => void) | null = null;

  confirm(options: ConfirmationOptions): Promise<boolean> {
    if (this.resolver) {
      this.resolver(false);
    }

    const request: ConfirmationRequest = {
      id: ++this.nextId,
      title: options.title,
      description: options.description,
    };

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.currentConfirmation.set(request);
    });
  }

  resolve(confirmed: boolean): void {
    if (!this.resolver) {
      return;
    }

    const resolve = this.resolver;
    this.resolver = null;
    this.currentConfirmation.set(null);
    resolve(confirmed);
  }
}
