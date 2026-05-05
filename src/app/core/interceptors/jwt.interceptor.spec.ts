import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: { getStoredToken: jest.Mock };

  beforeEach(() => {
    authService = { getStoredToken: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds the bearer token when one exists', () => {
    authService.getStoredToken.mockReturnValue('secure-token');

    http.get('/secure').subscribe();

    const request = httpMock.expectOne('/secure');
    expect(request.request.headers.get('Authorization')).toBe('Bearer secure-token');
    request.flush({});
  });

  it('leaves the request unchanged when there is no token', () => {
    authService.getStoredToken.mockReturnValue(null);

    http.get('/public').subscribe();

    const request = httpMock.expectOne('/public');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
