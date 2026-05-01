import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, of, tap } from 'rxjs';
import { EntityId, Notification } from '../models';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private baseUrl = `${environment.apiUrl}/api/v1/notifications`;
  unreadCount$ = new BehaviorSubject<number>(0);

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  getNotifications(): Observable<Notification[]> {
    const userId = this.auth.getCurrentUserId();
    return userId == null
      ? of([])
      : this.http.get<Notification[]>(`${this.baseUrl}/recipient/${userId}`);
  }

  getUnreadCount(): Observable<number> {
    const userId = this.auth.getCurrentUserId();
    if (userId == null) {
      this.unreadCount$.next(0);
      return of(0);
    }

    return this.http.get<{ recipientId: number; unreadCount: number }>(
      `${this.baseUrl}/recipient/${userId}/unread-count`
    ).pipe(
      map(response => response.unreadCount),
      tap(count => this.unreadCount$.next(count))
    );
  }

  markRead(id: EntityId): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/read`, {}).pipe(
      tap(() => this.unreadCount$.next(Math.max(0, this.unreadCount$.value - 1)))
    );
  }

  markAllRead(): Observable<void> {
    const userId = this.auth.getCurrentUserId();
    if (userId == null) {
      this.unreadCount$.next(0);
      return of(void 0);
    }

    return this.http.put<void>(`${this.baseUrl}/recipient/${userId}/read-all`, {}).pipe(
      tap(() => this.unreadCount$.next(0))
    );
  }

  deleteNotification(id: EntityId): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  sendBulk(data: any): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/bulk`, data);
  }
}
