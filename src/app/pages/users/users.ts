import {
  Component, OnInit, OnDestroy, inject, signal, computed
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { UsersService } from '../../services/users.service';
import { RolesService } from '../../services/roles.service';
import { CentresService } from '../../services/centres.service';
import { ToastService } from '../../services/toast.service';
import type { UserDto, RoleDto, RegisterDto, UpdateUserDto, UserCentreAssignmentDto, CentreDto } from '../../models/models';
import { SUBDIVISION_LABELS } from '../../models/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersComponent implements OnInit, OnDestroy {
  private readonly usersService  = inject(UsersService);
  private readonly rolesService  = inject(RolesService);
  private readonly centresService = inject(CentresService);
  private readonly toast         = inject(ToastService);

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

  // ── Sorting ──────────────────────────────────────────────────────────────────
  sortBy  = signal('userName');
  sortDir = signal<'asc' | 'desc'>('asc');

  sort(col: string): void {
    if (this.sortBy() === col) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(col);
      this.sortDir.set('asc');
    }
    this.page.set(1);
    this.loadUsers();
  }

  // Create modal
  showCreate    = signal(false);
  createForm: RegisterDto = this.emptyCreate();
  createError   = signal('');
  createLoading = signal(false);

  // Edit modal
  showEdit    = signal(false);
  editTarget  = signal<UserDto | null>(null);
  editForm: UpdateUserDto = { email: '' };
  editLoading = signal(false);

  // Role modal
  showRoles   = signal(false);
  roleTarget  = signal<UserDto | null>(null);
  roleToAdd   = signal('');
  roleLoading = signal(false);

  // Delete confirm
  deleteTarget  = signal<UserDto | null>(null);
  deleteLoading = signal(false);

  // Reset password modal
  showResetPwd    = signal(false);
  resetPwdTarget  = signal<UserDto | null>(null);
  resetPwdForm    = { newPassword: '', confirm: '' };
  resetPwdError   = signal('');
  resetPwdLoading = signal(false);

  // Centre modal
  showCentreModal    = signal(false);
  centreTarget       = signal<UserDto | null>(null);
  userCentres        = signal<UserCentreAssignmentDto[]>([]);
  userCentresLoading = signal(false);
  allCentres         = signal<CentreDto[]>([]);
  addCentreId        = signal<number | null>(null);
  addCentreIsPrimary = signal(false);
  readonly subdivisionLabels = SUBDIVISION_LABELS;

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
    this.usersService.list(this.page(), this.pageSize(), this.currentSearch, this.sortBy(), this.sortDir()).subscribe({
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
        this.toast.success('Utilisateur créé avec succès.');
        this.loadUsers();
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'Erreur lors de la création.';
        this.createError.set(msg);
        this.createLoading.set(false);
      },
    });
  }

  // ── Edit ───────────────────────────────────────────────────────────────
  openEdit(user: UserDto): void {
    this.editTarget.set(user);
    this.editForm = { email: user.email, firstName: user.firstName, lastName: user.lastName };
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
        this.toast.success('Profil mis à jour.');
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'Erreur lors de la mise à jour.';
        this.toast.error(msg);
        this.editLoading.set(false);
      },
    });
  }

  // ── Roles ──────────────────────────────────────────────────────────────
  openRoles(user: UserDto): void {
    this.roleTarget.set(user);
    this.roleToAdd.set('');
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
        this.toast.success(`Rôle '${role}' assigné.`);
      },
      error: () => {
        this.toast.error('Erreur lors de l\'assignation du rôle.');
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
        this.toast.success(`Rôle '${roleName}' supprimé.`);
      },
      error: () => this.toast.error('Erreur lors de la suppression du rôle.'),
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
    const user = this.deleteTarget();
    if (!user) return;
    this.deleteLoading.set(true);
    this.usersService.delete(user.id).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.id !== user.id));
        this.totalCount.update(n => n - 1);
        this.deleteTarget.set(null);
        this.deleteLoading.set(false);
        this.toast.success(`Utilisateur « ${user.userName} » supprimé définitivement.`);
      },
      error: () => {
        this.toast.error('Erreur lors de la suppression.');
        this.deleteLoading.set(false);
      },
    });
  }

  private emptyCreate(): RegisterDto {
    return { userName: '', email: '', password: '' };
  }

  // ── Centres ────────────────────────────────────────────────────────────
  openCentres(user: UserDto): void {
    this.centreTarget.set(user);
    this.userCentres.set([]);
    this.addCentreId.set(null);
    this.addCentreIsPrimary.set(false);
    this.showCentreModal.set(true);
    this.userCentresLoading.set(true);
    this.centresService.getForUser(user.id).subscribe({
      next:  cs => { this.userCentres.set(cs); this.userCentresLoading.set(false); },
      error: ()  => this.userCentresLoading.set(false),
    });
    if (this.allCentres().length === 0) {
      this.centresService.list().subscribe({ next: cs => this.allCentres.set(cs) });
    }
  }

  availableCentresToAdd(): CentreDto[] {
    const assigned = new Set(this.userCentres().map(c => c.centreId));
    return this.allCentres().filter(c => !assigned.has(c.id) && c.isActive);
  }

  assignCentreToUser(): void {
    const user     = this.centreTarget();
    const centreId = this.addCentreId();
    if (!user || centreId === null) return;
    this.centresService.assign({ userId: user.id, centreId, isPrimary: this.addCentreIsPrimary() }).subscribe({
      next: () => {
        this.toast.success('Centre affecté.');
        this.addCentreId.set(null);
        this.addCentreIsPrimary.set(false);
        this.centresService.getForUser(user.id).subscribe({ next: cs => this.userCentres.set(cs) });
      },
      error: err => this.toast.error(err?.error?.detail ?? 'Erreur lors de l\'affectation.'),
    });
  }

  removeCentreFromUser(centreId: number): void {
    const user = this.centreTarget();
    if (!user) return;
    this.centresService.unassign(user.id, centreId).subscribe({
      next: () => {
        this.userCentres.update(list => list.filter(c => c.centreId !== centreId));
        this.toast.success('Centre retiré.');
      },
      error: err => this.toast.error(err?.error?.detail ?? 'Erreur lors du retrait.'),
    });
  }

  // ── Reset password ─────────────────────────────────────────────────────
  openResetPwd(user: UserDto): void {
    this.resetPwdTarget.set(user);
    this.resetPwdForm = { newPassword: '', confirm: '' };
    this.resetPwdError.set('');
    this.showResetPwd.set(true);
  }

  submitResetPwd(): void {
    const { newPassword, confirm } = this.resetPwdForm;
    if (!newPassword) {
      this.resetPwdError.set('Le mot de passe ne peut pas être vide.');
      return;
    }
    if (newPassword !== confirm) {
      this.resetPwdError.set('Les mots de passe ne correspondent pas.');
      return;
    }
    const target = this.resetPwdTarget();
    if (!target) return;
    this.resetPwdLoading.set(true);
    this.usersService.resetPassword(target.id, newPassword).subscribe({
      next: () => {
        this.showResetPwd.set(false);
        this.resetPwdLoading.set(false);
        this.toast.success(`Mot de passe de ${target.userName} réinitialisé.`);
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'Erreur lors de la réinitialisation.';
        this.resetPwdError.set(msg);
        this.resetPwdLoading.set(false);
      },
    });
  }
}
