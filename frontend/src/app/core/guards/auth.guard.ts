/**
 * @description Functional auth guard that protects routes from unauthenticated access
 * @author Developer
 * @date 24-03-2026
 */
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.checkAuth().pipe(
    map((isAuth) => {
      if (isAuth) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};
