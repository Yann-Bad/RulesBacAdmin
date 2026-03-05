import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Never intercept token-endpoint requests — would cause infinite refresh loop
  if (req.url.includes('/connect/')) return next(req);

  const auth = inject(AuthService);
  return next(addBearer(req, auth.getAccessToken())).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        // If the session token is still fresh, this 401 is an authorisation problem
        // (wrong scope / role / audience) — a refresh won't fix it, so just propagate.
        if (!auth.isSessionExpired()) {
          return throwError(() => err);
        }

        // Token is expired: attempt a silent refresh.
        // catchError is placed BEFORE switchMap so it only catches refresh failures,
        // not errors from the retried original request.
        return auth.refresh().pipe(
          catchError(refreshErr => {
            const isNoToken = (refreshErr as Error)?.message === 'no_refresh_token';
            if (!isNoToken) auth.logout();
            return throwError(() => refreshErr);
          }),
          switchMap(() => next(addBearer(req, auth.getAccessToken()))),
        );
      }
      return throwError(() => err);
    }),
  );
};

function addBearer(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) return req;
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
