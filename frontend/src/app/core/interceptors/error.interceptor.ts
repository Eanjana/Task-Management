/**
 * @description Error interceptor that catches HTTP errors and shows toast notifications
 * @author Developer
 * @date 24-03-2026
 */
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';

      if (error.status === 401) {
        auth.logout();
        message = 'Session expired. Please login again.';
      } else if (error.status === 400) {
        message = error.error?.detail ?? 'Bad request';
      } else if (error.status === 404) {
        message = error.error?.detail ?? 'Resource not found';
      } else if (error.status === 500) {
        message = 'Server error. Please try again later.';
      } else if (error.status === 0) {
        message = 'Unable to connect to server';
      }

      toast.error(message);
      return throwError(() => error);
    })
  );
};
