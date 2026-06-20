import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

const AUTH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/forgot-password', '/api/auth/reset-password'];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  return next(req).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && !AUTH_PATHS.some(p => req.url.includes(p))) {
        if (err.status === 400) {
          toastService.error(extractApiMessage(err) ?? 'An error occurred.');
        } else {
          toastService.error('Something went wrong. Please try again later.');
        }
      }
      return throwError(() => err);
    }),
  );
};

function extractApiMessage(err: HttpErrorResponse): string | null {
  const body = err.error;
  if (!body || typeof body !== 'object') return null;
  if (typeof body.violation === 'string' && body.violation) return body.violation;
  if (typeof body.message  === 'string' && body.message)   return body.message;
  const vals = Object.values(body as Record<string, unknown>)
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
  return vals.length ? vals.join(' | ') : null;
}
