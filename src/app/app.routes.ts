import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { roleGuard } from './guards/role.guard';
import { authGuard } from './guards/auth.guard';
import { AuthService } from './services/auth.service';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Public — redirect away if already authenticated
  {
    path: 'login',
    canActivate: [() => {
      const auth   = inject(AuthService);
      const router = inject(Router);
      return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
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
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users').then(m => m.UsersComponent),
      },
      {
        path: 'users/:id',
        loadComponent: () => import('./pages/user-detail/user-detail').then(m => m.UserDetailComponent),
      },
      {
        path: 'roles',
        loadComponent: () => import('./pages/roles/roles').then(m => m.RolesComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent),
      },
      {
        path: 'audit',
        loadComponent: () => import('./pages/audit/audit').then(m => m.AuditComponent),
      },
      {
        path: 'clients',
        loadComponent: () => import('./pages/clients/clients').then(m => m.ClientsComponent),
      },
      {
        path: 'guide',
        loadComponent: () => import('./pages/guide/guide').then(m => m.GuideComponent),
      },
      {
        path: 'presence',
        loadComponent: () => import('./pages/presence/presence').then(m => m.PresenceComponent),
      },
      {
        path: 'centres',
        loadComponent: () => import('./pages/centres/centres').then(m => m.CentresComponent),
      },
    ],
  },

  // Catch-all
  { path: '**', redirectTo: 'users' },
];
