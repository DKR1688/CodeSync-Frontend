import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthStateService } from '../../core/services/auth-state.service';
import { CodesyncApiService } from '../../core/services/codesync-api.service';
import { NotificationItem } from '../../shared/models/codesync.models';

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayoutComponent {
  private readonly api = inject(CodesyncApiService);
  private readonly router = inject(Router);

  protected readonly auth = inject(AuthStateService);
  protected readonly notifications = signal<NotificationItem[]>([]);
  protected readonly unreadCount = signal(0);
  protected readonly notificationsOpen = signal(false);
  protected readonly gatewayOnline = signal<boolean | null>(null);

  constructor() {
    this.refreshGatewayStatus();

    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.loadNotifications(user.userId);
      } else {
        this.notifications.set([]);
        this.unreadCount.set(0);
        this.notificationsOpen.set(false);
      }
    });
  }

  protected toggleNotifications(): void {
    this.notificationsOpen.update((value) => !value);
  }

  protected markAllNotificationsRead(): void {
    const currentUser = this.auth.user();
    if (!currentUser) {
      return;
    }

    this.api.markAllNotificationsRead(currentUser.userId).subscribe({
      next: () => this.loadNotifications(currentUser.userId),
    });
  }

  protected deleteNotification(notificationId: number): void {
    const currentUser = this.auth.user();
    if (!currentUser) {
      return;
    }

    this.api.deleteNotification(notificationId).subscribe({
      next: () => this.loadNotifications(currentUser.userId),
    });
  }

  protected deleteReadNotifications(): void {
    const currentUser = this.auth.user();
    if (!currentUser) {
      return;
    }

    this.api.deleteReadNotifications(currentUser.userId).subscribe({
      next: () => this.loadNotifications(currentUser.userId),
    });
  }

  protected logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.notificationsOpen.set(false);
        this.router.navigate(['/']);
      },
    });
  }

  protected initials(fullName: string | null | undefined, username: string | null | undefined): string {
    const source = fullName?.trim() || username?.trim() || 'CS';
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  private refreshGatewayStatus(): void {
    this.api.getGatewayInfo().subscribe({
      next: () => this.gatewayOnline.set(true),
      error: () => this.gatewayOnline.set(false),
    });
  }

  private loadNotifications(userId: number): void {
    forkJoin({
      items: this.api.getNotificationsByRecipient(userId).pipe(catchError(() => of([]))),
      count: this.api.getUnreadNotificationCount(userId).pipe(
        catchError(() => of({ recipientId: userId, unreadCount: 0 })),
      ),
    }).subscribe(({ items, count }) => {
      const sorted = [...items].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt),
      );
      this.notifications.set(sorted.slice(0, 6));
      this.unreadCount.set(count.unreadCount);
    });
  }
}
