import { inject, Injectable, signal } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { catchError, finalize, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UserResponse,
} from '../../shared/models/codesync.models';
import { CodesyncApiService } from './codesync-api.service';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly api = inject(CodesyncApiService);
  private readonly storageKey = 'codesync-token';

  readonly token = signal<string | null>(this.readStoredToken());
  readonly user = signal<UserResponse | null>(null);
  readonly loading = signal(false);
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);

  hasToken(): boolean {
    return !!this.token();
  }

  isAuthenticated(): boolean {
    return !!this.user();
  }

  isAdmin(): boolean {
    return this.user()?.role === 'ADMIN';
  }

  restoreSession(): Observable<UserResponse | null> {
    if (!this.token()) {
      this.ready.set(true);
      return of(null);
    }

    if (this.user()) {
      this.ready.set(true);
      return of(this.user());
    }

    this.loading.set(true);
    return this.api.getCurrentProfile().pipe(
      tap((user) => {
        this.user.set(user);
        this.error.set(null);
      }),
      catchError((error) => {
        this.clearSession(false);
        this.error.set(this.toMessage(error));
        return of(null);
      }),
      finalize(() => {
        this.loading.set(false);
        this.ready.set(true);
      }),
    );
  }

  login(request: LoginRequest): Observable<UserResponse> {
    this.loading.set(true);
    this.error.set(null);

    return this.api.login(request).pipe(
      switchMap((response) => {
        if (!response.token) {
          return throwError(() => new Error('The server did not return a token.'));
        }

        this.persistToken(response.token);
        this.token.set(response.token);
        return this.api.getCurrentProfile();
      }),
      tap((user) => {
        this.user.set(user);
        this.ready.set(true);
      }),
      catchError((error) => {
        this.clearSession(false);
        this.error.set(this.toMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  register(request: RegisterRequest): Observable<UserResponse> {
    this.loading.set(true);
    this.error.set(null);

    return this.api.register(request).pipe(
      switchMap(() =>
        this.login({
          email: request.email,
          password: request.password,
        }),
      ),
      catchError((error) => {
        this.error.set(this.toMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  completeOAuthLogin(token: string): Observable<UserResponse> {
    this.loading.set(true);
    this.error.set(null);
    this.persistToken(token);
    this.token.set(token);

    return this.api.getCurrentProfile().pipe(
      tap((user) => {
        this.user.set(user);
        this.ready.set(true);
      }),
      catchError((error) => {
        this.clearSession(false);
        this.error.set(this.toMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  logout(): Observable<void> {
    return this.api.logout().pipe(
      map(() => void 0),
      catchError(() => of(void 0)),
      tap(() => this.clearSession()),
    );
  }

  updateProfile(request: UpdateProfileRequest): Observable<UserResponse> {
    this.loading.set(true);
    this.error.set(null);
    return this.api.updateCurrentProfile(request).pipe(
      tap((user) => this.user.set(user)),
      catchError((error) => {
        this.error.set(this.toMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    this.loading.set(true);
    this.error.set(null);
    return this.api.changePassword(request).pipe(
      catchError((error) => {
        this.error.set(this.toMessage(error));
        return throwError(() => error);
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  clearSession(markReady = true): void {
    this.token.set(null);
    this.user.set(null);
    this.error.set(null);
    if (markReady) {
      this.ready.set(true);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }

  ensureAuthenticated(router: Router, fallback: UrlTree): boolean | UrlTree | Observable<boolean | UrlTree> {
    if (this.user()) {
      return true;
    }

    if (!this.hasToken()) {
      return fallback;
    }

    return this.restoreSession().pipe(map((user) => (user ? true : fallback)));
  }

  ensureAdmin(router: Router, fallback: UrlTree): boolean | UrlTree | Observable<boolean | UrlTree> {
    if (this.isAdmin()) {
      return true;
    }

    if (!this.hasToken()) {
      return fallback;
    }

    return this.restoreSession().pipe(
      map((user) => (user?.role === 'ADMIN' ? true : fallback)),
    );
  }

  private persistToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, token);
    }
  }

  private readStoredToken(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(this.storageKey);
  }

  private toMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error?: unknown }).error === 'object'
    ) {
      const apiError = (error as { error?: { message?: string } }).error;
      if (apiError?.message) {
        return apiError.message;
      }
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message?: unknown }).message === 'string'
    ) {
      return (error as { message: string }).message;
    }

    return 'Something went wrong while talking to the backend.';
  }
}
