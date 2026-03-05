import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth      = inject(AuthService);
  const router    = inject(Router);
  const required  = (route.data['roles'] as string[] | undefined) ?? [];

  if (required.length === 0) return true;

  const user = auth.currentUser();
  if (!user) return router.createUrlTree(['/login']);

  const hasRole = required.some(r => user.roles.includes(r));
  if (hasRole) return true;

  return router.createUrlTree(['/forbidden']);
};
