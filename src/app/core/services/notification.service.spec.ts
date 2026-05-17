import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const notificationBaseUrl = `${environment.apiUrl}/api/v1/notifications`;
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let authService: { getCurrentUserId: jest.Mock };

  beforeEach(() => {
    authService = { getCurrentUserId: jest.fn().mockReturnValue(9) };

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('returns an empty list when no authenticated user exists', async () => {
    authService.getCurrentUserId.mockReturnValue(null);

    await expect(firstValueFrom(service.getNotifications())).resolves.toEqual([]);
    httpMock.expectNone(() => true);
  });

  it('loads the unread count and updates the state', async () => {
    const result = firstValueFrom(service.getUnreadCount());

    const request = httpMock.expectOne(`${notificationBaseUrl}/recipient/9/unread-count`);
    request.flush({ recipientId: 9, unreadCount: 5 });

    await expect(result).resolves.toBe(5);
    expect(service.unreadCount$.value).toBe(5);
  });

  it('marks one notification as read and decrements the unread count', async () => {
    service.unreadCount$.next(3);

    const result = firstValueFrom(service.markRead(12));

    const request = httpMock.expectOne(`${notificationBaseUrl}/12/read`);
    expect(request.request.method).toBe('PUT');
    request.flush(null);

    await expect(result).resolves.toBeNull();
    expect(service.unreadCount$.value).toBe(2);
  });

  it('marks all notifications as read for the current user', async () => {
    service.unreadCount$.next(7);

    const result = firstValueFrom(service.markAllRead());

    const request = httpMock.expectOne(`${notificationBaseUrl}/recipient/9/read-all`);
    expect(request.request.method).toBe('PUT');
    request.flush(null);

    await expect(result).resolves.toBeNull();
    expect(service.unreadCount$.value).toBe(0);
  });

  it('resets the unread state immediately when no user exists for markAllRead', async () => {
    authService.getCurrentUserId.mockReturnValue(null);
    service.unreadCount$.next(4);

    await expect(firstValueFrom(service.markAllRead())).resolves.toBeUndefined();
    expect(service.unreadCount$.value).toBe(0);
    httpMock.expectNone(() => true);
  });
});
