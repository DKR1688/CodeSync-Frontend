import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthStateService } from '../services/auth-state.service';

const EXCLUDED_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/admin/bootstrap'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthStateService);
  const shouldAttachToken =
    !!auth.token() && !EXCLUDED_AUTH_PATHS.some((path) => request.url.includes(path));

  const authorizedRequest = shouldAttachToken
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${auth.token()}`,
        },
      })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error) => {
      if (error.status === 401 && !EXCLUDED_AUTH_PATHS.some((path) => request.url.includes(path))) {
        auth.clearSession();
      }
      return throwError(() => error);
    }),
  );
};
