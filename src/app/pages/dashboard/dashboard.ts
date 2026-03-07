import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UsersService } from '../../services/users.service';
import { RolesService } from '../../services/roles.service';
import { PermissionsService } from '../../services/permissions.service';
import { forkJoin } from 'rxjs';

export interface AppStats {
  application: string;
  roleCount:       number;
  permissionCount: number;
  userCount:       number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private readonly usersService       = inject(UsersService);
  private readonly rolesService       = inject(RolesService);
  private readonly permissionsService = inject(PermissionsService);

  loading = signal(true);
  error   = signal('');

  totalUsers       = signal(0);
  activeUsers      = signal(0);
  inactiveUsers    = signal(0);
  totalRoles       = signal(0);
  totalPermissions = signal(0);
  appStats         = signal<AppStats[]>([]);

  ngOnInit(): void {
    forkJoin({
      allDetailed: this.usersService.list(1, 10000),
      allRoles:    this.rolesService.list(1, 10000),
      allPerms:    this.permissionsService.list(),
    }).subscribe({
      next: ({ allDetailed, allRoles, allPerms }) => {
        const users = allDetailed.items;
        this.totalUsers.set(allDetailed.totalCount);
        this.activeUsers.set(users.filter(u => u.isActive).length);
        this.inactiveUsers.set(users.filter(u => !u.isActive).length);
        this.totalRoles.set(allRoles.totalCount);
        this.totalPermissions.set(allPerms.length);

        // Build role-name → application lookup
        const roleAppMap = new Map<string, string>();
        for (const r of allRoles.items) {
          if (r.application) roleAppMap.set(r.name, r.application);
        }

        // Collect all known applications
        const apps = Array.from(
          new Set([
            ...allRoles.items.map(r => r.application).filter(Boolean) as string[],
            ...allPerms.map(p => p.application),
          ])
        ).sort();

        // Roles per application
        const roleCounts = new Map<string, number>();
        for (const r of allRoles.items) {
          if (r.application) roleCounts.set(r.application, (roleCounts.get(r.application) ?? 0) + 1);
        }

        // Permissions per application
        const permCounts = new Map<string, number>();
        for (const p of allPerms) {
          permCounts.set(p.application, (permCounts.get(p.application) ?? 0) + 1);
        }

        // Users per application: user counted for an app if they hold
        // at least one role belonging to that app
        const userCounts = new Map<string, number>();
        for (const u of users) {
          const userApps = new Set<string>();
          for (const roleName of u.roles) {
            const app = roleAppMap.get(roleName);
            if (app) userApps.add(app);
          }
          for (const app of userApps) {
            userCounts.set(app, (userCounts.get(app) ?? 0) + 1);
          }
        }

        this.appStats.set(apps.map(app => ({
          application:     app,
          roleCount:       roleCounts.get(app) ?? 0,
          permissionCount: permCounts.get(app) ?? 0,
          userCount:       userCounts.get(app) ?? 0,
        })));

        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les statistiques.');
        this.loading.set(false);
      },
    });
  }
}
