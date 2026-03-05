import {
  Component, OnInit, OnDestroy, inject, signal, computed
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
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
export class UsersComponent implements OnInit, OnDestroy {
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);

  users       = signal<UserDto[]>([]);
  allRoles    = signal<RoleDto[]>([]);
  loading     = signal(true);
  error       = signal('');

  // ── Pagination & search ─────────────────────────────────────────────────
  page        = signal(1);
  pageSize    = signal(10);
  totalCount  = signal(0);
  totalPages  = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  // Visible page buttons: always show first, last, current ±2, with null as ellipsis marker
  pageWindow  = computed<(number | null)[]>(() => {
    const total   = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const show = new Set([1, total, current - 1, current, current + 1].filter(p => p >= 1 && p <= total));
    const sorted = Array.from(show).sort((a, b) => a - b);
    const result: (number | null)[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(null); // ellipsis
      result.push(sorted[i]);
    }
    return result;
  });
  from        = computed(() => this.totalCount() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1);
  to          = computed(() => Math.min(this.page() * this.pageSize(), this.totalCount()));
  readonly pageSizeOptions = [5, 10, 25, 50];

  private readonly searchInput$ = new Subject<string>();
  private searchSub!: Subscription;
  // Track current search value for loadUsers() calls
  private currentSearch = '';

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

  ngOnInit(): void {
    // Debounce search input: wait 300 ms after the user stops typing, then
    // reset to page 1 and reload. switchMap cancels any in-flight request.
    this.searchSub = this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ).subscribe(q => {
      this.currentSearch = q;
      this.page.set(1);
      this.loadUsers();
    });

    this.loadUsers();
    // Load all roles (no pagination) for the assign-role dropdown
    this.rolesService.list(1, 200).subscribe({
      next: result => this.allRoles.set(result.items),
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.loadUsers();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(+size);
    this.page.set(1);
    this.loadUsers();
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.error.set('');
    this.usersService.list(this.page(), this.pageSize(), this.currentSearch).subscribe({
      next: result => {
        this.users.set(result.items);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les utilisateurs.');
        this.loading.set(false);
      },
    });
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
      next: () => {
        this.showCreate.set(false);
        this.createLoading.set(false);
        this.loadUsers(); // reload the current page to show the new user
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
