import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { roleGuard } from './guards/role.guard';
import { authGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';

export const routes: Routes = [
  { path: '', redirectTo: 'users', pathMatch: 'full' },

  // Public — redirect away if already authenticated
  {
    path: 'login',
    canActivate: [() => {
      const auth   = inject(AuthService);
      const router = inject(Router);
      return auth.isAuthenticated() ? router.createUrlTree(['/users']) : true;
    }],
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./pages/forbidden/forbidden').then(m => m.ForbiddenComponent),
  },

  // Protected — SuperAdmin only, wrapped in the layout shell
  {
    path: '',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['SuperAdmin'] },
    loadComponent: () => import('./layout/layout').then(m => m.LayoutComponent),
    children: [
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users').then(m => m.UsersComponent),
      },
      {
        path: 'roles',
        loadComponent: () => import('./pages/roles/roles').then(m => m.RolesComponent),
      },
    ],
  },

  // Catch-all
  { path: '**', redirectTo: 'users' },
];
