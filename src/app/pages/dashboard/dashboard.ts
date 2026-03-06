import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UsersService } from '../../services/users.service';
import { RolesService } from '../../services/roles.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);

  loading = signal(true);
  error   = signal('');

  totalUsers    = signal(0);
  activeUsers   = signal(0);
  inactiveUsers = signal(0);
  totalRoles    = signal(0);

  ngOnInit(): void {
    // Fetch page 1 with pageSize=1 just to get totalCount cheaply,
    // plus a full active/inactive breakdown for users via two filtered calls.
    forkJoin({
      allUsers:    this.usersService.list(1, 1),
      // search trick: we can't filter by isActive server-side yet,
      // so load the first page of all users with a large page to get counts
      // (will be replaced by dedicated stats endpoint when needed)
      allDetailed: this.usersService.list(1, 10000),
      roles:       this.rolesService.list(1, 1),
    }).subscribe({
      next: ({ allDetailed, roles }) => {
        const users = allDetailed.items;
        this.totalUsers.set(allDetailed.totalCount);
        this.activeUsers.set(users.filter(u => u.isActive).length);
        this.inactiveUsers.set(users.filter(u => !u.isActive).length);
        this.totalRoles.set(roles.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les statistiques.');
        this.loading.set(false);
      },
    });
  }
}
