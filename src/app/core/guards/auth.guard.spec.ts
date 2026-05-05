import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('auth guards', () => {
  let authService: { isAuthenticated: jest.Mock; isAdmin: jest.Mock };
  let router: { navigate: jest.Mock };

  beforeEach(() => {
    authService = {
      isAuthenticated: jest.fn(),
      isAdmin: jest.fn(),
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows authenticated users through authGuard', () => {
    authService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects guests to login through authGuard', () => {
    authService.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('allows admins through adminGuard', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.isAdmin.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('redirects non-admins from adminGuard', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.isAdmin.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('allows guests through guestGuard', () => {
    authService.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('redirects authenticated users away from guestGuard', () => {
    authService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
