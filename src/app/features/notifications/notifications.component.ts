import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';
import { Notification } from '../../core/models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit {
  cdr = inject(ChangeDetectorRef);
  notifService = inject(NotificationService);
  wsService = inject(WebSocketService);
  auth = inject(AuthService);

  notifications: Notification[] = [];
  loading = true;
  filter: 'all' | 'unread' = 'all';

  ICONS: Record<string, string> = {
    SESSION_INVITE: '🎯', COMMENT: '💬', MENTION: '📢', SNAPSHOT: '📸', FORK: '🔀'
  };

  COLORS: Record<string, string> = {
    SESSION_INVITE: 'var(--accent)', COMMENT: 'var(--info)', MENTION: 'var(--warning)',
    SNAPSHOT: 'var(--success)', FORK: 'var(--text-muted)'
  };

  ngOnInit(): void {
    this.loadNotifications();
    const userId = this.auth.currentUser$.value?.userId;
    if (userId) {
      this.wsService.connectNotifications(String(userId)).subscribe(event => {
        if (event.type === 'UNREAD_COUNT') {
          this.notifService.unreadCount$.next(event.count);
        } else {
          this.notifications.unshift(event);
        }
        this.syncView();
      });
    }
  }

  loadNotifications(): void {
    this.loading = true;
    this.notifService.getNotifications().subscribe({
      next: (n) => {
        this.notifications = n;
        this.loading = false;
        this.syncView();
      },
      error: () => {
        this.loading = false;
        this.syncView();
      }
    });
  }

  get filtered(): Notification[] {
    return this.filter === 'unread' ? this.notifications.filter(n => !n.isRead) : this.notifications;
  }

  get unreadCount(): number { return this.notifications.filter(n => !n.isRead).length; }

  markRead(n: Notification): void {
    if (n.isRead) return;
    this.notifService.markRead(n.notificationId).subscribe(() => {
      const idx = this.notifications.findIndex(x => x.notificationId === n.notificationId);
      if (idx > -1) this.notifications[idx] = { ...n, isRead: true };
      this.syncView();
    });
  }

  markAllRead(): void {
    this.notifService.markAllRead().subscribe(() => {
      this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
      this.syncView();
    });
  }

  deleteNotification(id: string | number): void {
    this.notifService.deleteNotification(id).subscribe(() => {
      this.notifications = this.notifications.filter(n => n.notificationId !== id);
      this.syncView();
    });
  }

  getTimeAgo(d: string): string {
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }
}
