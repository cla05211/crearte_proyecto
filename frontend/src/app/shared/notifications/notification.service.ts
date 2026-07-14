import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  title: string;
  description: string;
  duration?: number;
}

export interface AppNotification extends Required<NotificationOptions> {
  id: number;
  type: NotificationType;
  closing: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<AppNotification[]>([]);

  private readonly defaultDuration = 5000;
  private readonly closingDuration = 220;
  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(options: NotificationOptions): void {
    this.show('success', options);
  }

  error(options: NotificationOptions): void {
    this.show('error', options);
  }

  warning(options: NotificationOptions): void {
    this.show('warning', options);
  }

  info(options: NotificationOptions): void {
    this.show('info', options);
  }

  show(type: NotificationType, options: NotificationOptions): void {
    const id = ++this.nextId;
    const notification: AppNotification = {
      id,
      type,
      title: options.title,
      description: options.description,
      duration: options.duration ?? this.defaultDuration,
      closing: false,
    };

    this.notifications.update((items) => [...items, notification]);
    this.timers.set(id, setTimeout(() => this.dismiss(id), notification.duration));
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    const notification = this.notifications().find((item) => item.id === id);
    if (!notification || notification.closing) {
      return;
    }

    this.notifications.update((items) =>
      items.map((item) => (item.id === id ? { ...item, closing: true } : item)),
    );

    setTimeout(() => {
      this.notifications.update((items) => items.filter((item) => item.id !== id));
    }, this.closingDuration);
  }
}
