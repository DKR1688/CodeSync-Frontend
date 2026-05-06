import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'codesync_token';
  private readonly USER_KEY = 'codesync_user';
  private baseUrl = `${environment.apiUrl}/auth`;

  currentUser$ = new BehaviorSubject<User | null>(this.getStoredUser());
  isAuthenticated = signal<boolean>(!!this.getStoredToken());

  constructor(private http: HttpClient, private router: Router) {}

  login(req: LoginRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, req).pipe(
      tap(res => this.handleAuthSuccess(res)),
      switchMap(() => this.getProfile())
    );
  }

  register(req: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/register`, req).pipe(
      switchMap(user => this.http.post<AuthResponse>(`${this.baseUrl}/login`, {
        email: req.email,
        password: req.password
      }).pipe(
        tap(res => this.handleAuthSuccess(res)),
        map(() => this.storeUser(user))
      ))
    );
  }

  logout(): void {
    this.http.post(`${this.baseUrl}/logout`, {}).subscribe({ error: () => void 0 });
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/profile`).pipe(
      tap(user => this.storeUser(user))
    );
  }

  getUserProfile(userId: string | number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/profile/${userId}`);
  }

  searchUsers(username: string): Observable<User[]> {
    const params = new HttpParams().set('username', username);
    return this.http.get<User[]>(`${this.baseUrl}/search`, { params });
  }

  handleOAuthCallback(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this.getProfile().subscribe(() => this.router.navigate(['/dashboard']));
  }

  private handleAuthSuccess(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
  }

  private storeUser(user: User): User {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUser$.next(user);
    this.isAuthenticated.set(true);
    return user;
  }

  getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUserId(): string | number | null {
    return this.currentUser$.value?.userId ?? this.getStoredUser()?.userId ?? null;
  }

  ensureProfileLoaded(): Observable<User | null> {
    if (!this.isAuthenticated()) {
      return of(null);
    }

    if (this.currentUser$.value) {
      return of(this.currentUser$.value);
    }

    return this.getProfile().pipe(
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  private getStoredUser(): User | null {
    const u = localStorage.getItem(this.USER_KEY);
    if (!u) {
      return null;
    }

    try {
      return JSON.parse(u) as User;
    } catch {
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
  }

  isAdmin(): boolean {
    return this.currentUser$.value?.role === 'ADMIN';
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser$.next(null);
    this.isAuthenticated.set(false);
  }
}
