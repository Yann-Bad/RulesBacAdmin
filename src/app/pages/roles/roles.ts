import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RolesService } from '../../services/roles.service';
import type { RoleDto, CreateRoleDto } from '../../models/models';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './roles.html',
  styleUrl: './roles.css',
})
export class RolesComponent implements OnInit {
  private readonly rolesService = inject(RolesService);

  roles         = signal<RoleDto[]>([]);
  loading       = signal(true);
  error         = signal('');

  showCreate    = signal(false);
  createForm: CreateRoleDto = { name: '' };
  createError   = signal('');
  createLoading = signal(false);

  deleteTarget  = signal<RoleDto | null>(null);
  deleteLoading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.rolesService.list().subscribe({
      next: roles => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les rôles.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.createForm = { name: '' };
    this.createError.set('');
    this.showCreate.set(true);
  }

  submitCreate(): void {
    if (!this.createForm.name.trim()) {
      this.createError.set('Le nom du rôle est requis.');
      return;
    }
    this.createLoading.set(true);
    this.rolesService.create(this.createForm).subscribe({
      next: role => {
        this.roles.update(list => [...list, role]);
        this.showCreate.set(false);
        this.createLoading.set(false);
      },
      error: () => {
        this.createError.set('Erreur lors de la création du rôle.');
        this.createLoading.set(false);
      },
    });
  }

  confirmDelete(): void {
    const role = this.deleteTarget();
    if (!role) return;
    this.deleteLoading.set(true);
    this.rolesService.delete(role.name).subscribe({
      next: () => {
        this.roles.update(list => list.filter(r => r.name !== role.name));
        this.deleteTarget.set(null);
        this.deleteLoading.set(false);
      },
      error: () => this.deleteLoading.set(false),
    });
  }
}
