import {
  Component, OnInit, inject, signal, computed
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../services/users.service';
import { RolesService } from '../../services/roles.service';
import type { UserDto, RoleDto, RegisterDto, UpdateUserDto } from '../../models/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);

  users       = signal<UserDto[]>([]);
  allRoles    = signal<RoleDto[]>([]);
  loading     = signal(true);
  error       = signal('');
  search      = signal('');

  // Create modal
  showCreate  = signal(false);
  createForm: RegisterDto = this.emptyCreate();
  createError = signal('');
  createLoading = signal(false);

  // Edit modal
  showEdit    = signal(false);
  editTarget  = signal<UserDto | null>(null);
  editForm: UpdateUserDto = { email: '' };
  editError   = signal('');
  editLoading = signal(false);

  // Role modal
  showRoles   = signal(false);
  roleTarget  = signal<UserDto | null>(null);
  roleToAdd   = signal('');
  roleLoading = signal(false);
  roleError   = signal('');

  // Delete confirm
  deleteTarget = signal<UserDto | null>(null);
  deleteLoading = signal(false);

  filteredUsers = computed(() => {
    const q = this.search().toLowerCase();
    return q
      ? this.users().filter(u =>
          u.userName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q))
      : this.users();
  });

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.loading.set(true);
    this.usersService.list().subscribe({
      next: users => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les utilisateurs.');
        this.loading.set(false);
      },
    });
    // this.rolesService.list().subscribe({
    //   next: roles => this.allRoles.set(roles),
    // });
  }

  // ── Toggle active ──────────────────────────────────────────────────────
  toggleActive(user: UserDto): void {
    this.usersService.setActive(user.id, !user.isActive).subscribe({
      next: () => this.users.update(list =>
        list.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u)
      ),
      error: () => this.error.set('Erreur lors du changement de statut.'),
    });
  }

  // ── Create ─────────────────────────────────────────────────────────────
  openCreate(): void {
    this.createForm  = this.emptyCreate();
    this.createError.set('');
    this.showCreate.set(true);
  }

  submitCreate(): void {
    if (!this.createForm.userName || !this.createForm.email || !this.createForm.password) {
      this.createError.set('Tous les champs sont requis.');
      return;
    }
    this.createLoading.set(true);
    this.usersService.create(this.createForm).subscribe({
      next: user => {
        this.users.update(list => [...list, user]);
        this.showCreate.set(false);
        this.createLoading.set(false);
      },
      error: () => {
        this.createError.set('Erreur lors de la création.');
        this.createLoading.set(false);
      },
    });
  }

  // ── Edit ───────────────────────────────────────────────────────────────
  openEdit(user: UserDto): void {
    this.editTarget.set(user);
    this.editForm = { email: user.email, firstName: user.firstName, lastName: user.lastName };
    this.editError.set('');
    this.showEdit.set(true);
  }

  submitEdit(): void {
    const target = this.editTarget();
    if (!target) return;
    this.editLoading.set(true);
    this.usersService.update(target.id, this.editForm).subscribe({
      next: updated => {
        this.users.update(list =>
          list.map(u => u.id === updated.id ? updated : u)
        );
        this.showEdit.set(false);
        this.editLoading.set(false);
      },
      error: () => {
        this.editError.set('Erreur lors de la mise à jour.');
        this.editLoading.set(false);
      },
    });
  }

  // ── Roles ──────────────────────────────────────────────────────────────
  openRoles(user: UserDto): void {
    this.roleTarget.set(user);
    this.roleToAdd.set('');
    this.roleError.set('');
    this.showRoles.set(true);
  }

  assignRole(): void {
    const user = this.roleTarget();
    const role = this.roleToAdd();
    if (!user || !role) return;
    this.roleLoading.set(true);
    this.usersService.assignRole({ userId: user.id, roleName: role }).subscribe({
      next: () => {
        this.users.update(list =>
          list.map(u => u.id === user.id
            ? { ...u, roles: [...u.roles, role] }
            : u)
        );
        this.roleTarget.update(u => u ? { ...u, roles: [...u.roles, role] } : u);
        this.roleToAdd.set('');
        this.roleLoading.set(false);
      },
      error: () => {
        this.roleError.set('Erreur lors de l\'assignation.');
        this.roleLoading.set(false);
      },
    });
  }

  removeRole(roleName: string): void {
    const user = this.roleTarget();
    if (!user) return;
    this.usersService.removeRole(user.id, roleName).subscribe({
      next: () => {
        const updated = { ...user, roles: user.roles.filter(r => r !== roleName) };
        this.users.update(list =>
          list.map(u => u.id === user.id ? updated : u)
        );
        this.roleTarget.set(updated);
      },
      error: () => this.roleError.set('Erreur lors de la suppression du rôle.'),
    });
  }

  availableRolesToAdd(): string[] {
    const current = this.roleTarget()?.roles ?? [];
    return this.allRoles()
      .map(r => r.name)
      .filter(n => !current.includes(n));
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  openDelete(user: UserDto): void {
    this.deleteTarget.set(user);
  }

  confirmDelete(): void {
    // No delete endpoint in UsersController — use deactivate instead
    const user = this.deleteTarget();
    if (!user) return;
    this.deleteLoading.set(true);
    this.usersService.setActive(user.id, false).subscribe({
      next: () => {
        this.users.update(list =>
          list.map(u => u.id === user.id ? { ...u, isActive: false } : u)
        );
        this.deleteTarget.set(null);
        this.deleteLoading.set(false);
      },
      error: () => this.deleteLoading.set(false),
    });
  }

  private emptyCreate(): RegisterDto {
    return { userName: '', email: '', password: '' };
  }
}
