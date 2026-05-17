import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, User } from '../models';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const authBaseUrl = `${environment.authUrl}/auth`;
  const loginRequest = { email: 'deepak@codesync.dev', password: 'secret123' };
  const registerRequest = {
    username: 'deepak',
    email: 'deepak@codesync.dev',
    password: 'secret123',
    fullName: 'Deepak Kumar',
  };
  const profile: User = {
    userId: 7,
    username: 'deepak',
    email: 'deepak@codesync.dev',
    fullName: 'Deepak Kumar',
    role: 'ADMIN',
    provider: 'LOCAL',
    active: true,
    createdAt: '2026-05-05T00:00:00Z',
  };
  const authResponse: AuthResponse = {
    token: 'jwt-token',
    message: 'Login successful',
  };

  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: { navigate: jest.Mock };

  beforeEach(() => {
    localStorage.clear();
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('logs in, stores the token, and then loads the profile', async () => {
    const result = firstValueFrom(service.login(loginRequest));

    const loginCall = httpMock.expectOne(`${authBaseUrl}/login`);
    expect(loginCall.request.method).toBe('POST');
    expect(loginCall.request.body).toEqual(loginRequest);
    loginCall.flush(authResponse);

    const profileCall = httpMock.expectOne(`${authBaseUrl}/profile`);
    expect(profileCall.request.method).toBe('GET');
    profileCall.flush(profile);

    await expect(result).resolves.toEqual(profile);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser$.value).toEqual(profile);
    expect(service.getStoredToken()).toBe('jwt-token');
  });

  it('registers, auto logs in, and stores the user', async () => {
    const result = firstValueFrom(service.register(registerRequest));

    const registerCall = httpMock.expectOne(`${authBaseUrl}/register`);
    expect(registerCall.request.method).toBe('POST');
    expect(registerCall.request.body).toEqual(registerRequest);
    registerCall.flush(profile);

    const loginCall = httpMock.expectOne(`${authBaseUrl}/login`);
    expect(loginCall.request.body).toEqual({
      email: registerRequest.email,
      password: registerRequest.password,
    });
    loginCall.flush(authResponse);

    await expect(result).resolves.toEqual(profile);
    expect(service.currentUser$.value).toEqual(profile);
    expect(localStorage.getItem('codesync_user')).toContain('"userId":7');
  });

  it('logs out, clears local state, and redirects', () => {
    localStorage.setItem('codesync_token', 'jwt-token');
    localStorage.setItem('codesync_user', JSON.stringify(profile));
    service.currentUser$.next(profile);
    service.isAuthenticated.set(true);

    service.logout();

    const logoutCall = httpMock.expectOne(`${authBaseUrl}/logout`);
    expect(logoutCall.request.method).toBe('POST');
    logoutCall.flush({});

    expect(service.currentUser$.value).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('codesync_token')).toBeNull();
    expect(localStorage.getItem('codesync_user')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('loads a user profile by id and searches users by username', () => {
    service.getUserProfile(3).subscribe();
    service.searchUsers('deep').subscribe();

    const profileCall = httpMock.expectOne(`${authBaseUrl}/profile/3`);
    expect(profileCall.request.method).toBe('GET');
    profileCall.flush(profile);

    const searchCall = httpMock.expectOne(req =>
      req.url === `${authBaseUrl}/search` && req.params.get('username') === 'deep'
    );
    expect(searchCall.request.method).toBe('GET');
    searchCall.flush([profile]);
  });

  it('stores the OAuth token and redirects after loading the profile', () => {
    service.handleOAuthCallback('oauth-token');

    const profileCall = httpMock.expectOne(`${authBaseUrl}/profile`);
    profileCall.flush(profile);

    expect(localStorage.getItem('codesync_token')).toBe('oauth-token');
    expect(service.currentUser$.value).toEqual(profile);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('clears the previous user immediately when an OAuth token replaces the session', () => {
    localStorage.setItem('codesync_user', JSON.stringify(profile));
    service.currentUser$.next(profile);
    service.isAuthenticated.set(true);

    service.handleOAuthCallback('replacement-token');

    expect(localStorage.getItem('codesync_token')).toBe('replacement-token');
    expect(localStorage.getItem('codesync_user')).toBeNull();
    expect(service.currentUser$.value).toBeNull();

    const profileCall = httpMock.expectOne(`${authBaseUrl}/profile`);
    profileCall.flush(profile);
  });

  it('returns the cached current user from ensureProfileLoaded', async () => {
    service.isAuthenticated.set(true);
    service.currentUser$.next(profile);

    await expect(firstValueFrom(service.ensureProfileLoaded())).resolves.toEqual(profile);
    httpMock.expectNone(`${authBaseUrl}/profile`);
  });

  it('clears the session when profile loading fails', async () => {
    localStorage.setItem('codesync_token', 'jwt-token');
    service.isAuthenticated.set(true);

    const result = firstValueFrom(service.ensureProfileLoaded());

    const profileCall = httpMock.expectOne(`${authBaseUrl}/profile`);
    profileCall.flush({ message: 'error' }, { status: 500, statusText: 'Server Error' });

    await expect(result).resolves.toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser$.value).toBeNull();
    expect(localStorage.getItem('codesync_token')).toBeNull();
  });

  it('removes invalid stored users during construction', () => {
    localStorage.setItem('codesync_user', '{bad-json');

    const freshService = new AuthService({} as HttpClient, router as unknown as Router);

    expect(freshService.currentUser$.value).toBeNull();
    expect(localStorage.getItem('codesync_user')).toBeNull();
  });

  it('exposes the current user id and admin flag', () => {
    service.currentUser$.next(profile);

    expect(service.getCurrentUserId()).toBe(7);
    expect(service.isAdmin()).toBe(true);
  });
});
