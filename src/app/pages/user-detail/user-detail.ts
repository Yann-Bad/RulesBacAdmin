import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../services/users.service';
import { RolesService } from '../../services/roles.service';
import { ToastService } from '../../services/toast.service';
import type { UserDto, RoleDto, UpdateUserDto } from '../../models/models';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css',
})
export class UserDetailComponent implements OnInit {
  private readonly route        = inject(ActivatedRoute);
  private readonly router       = inject(Router);
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly toast        = inject(ToastService);

  user     = signal<UserDto | null>(null);
  allRoles = signal<RoleDto[]>([]);
  loading  = signal(true);
  error    = signal('');

  // ── Profile edit ────────────────────────────────────────────────────────
  profileForm: UpdateUserDto = {};
  profileLoading = signal(false);

  // ── Password reset ───────────────────────────────────────────────────────
  showResetPwd    = signal(false);
  resetPwdForm    = { newPassword: '', confirm: '' };
  resetPwdError   = signal('');
  resetPwdLoading = signal(false);

  // ── Role management ──────────────────────────────────────────────────────
  roleToAdd   = signal('');
  roleLoading = signal(false);

  // ── Delete ───────────────────────────────────────────────────────────────
  showDelete    = signal(false);
  deleteLoading = signal(false);

  // ── Derived ─────────────────────────────────────────────────────────────
  initials = computed(() => {
    const u = this.user();
    return u?.userName ? u.userName.slice(0, 2).toUpperCase() : '?';
  });

  availableRolesToAdd = computed(() => {
    const current = this.user()?.roles ?? [];
    return this.allRoles().map(r => r.name).filter(n => !current.includes(n));
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/users']); return; }

    this.load(id);

    this.rolesService.list(1, 200).subscribe({
      next: result => this.allRoles.set(result.items),
    });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set('');
    this.usersService.get(id).subscribe({
      next: user => {
        this.user.set(user);
        this.profileForm = { firstName: user.firstName, lastName: user.lastName, email: user.email };
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger cet utilisateur.');
        this.loading.set(false);
      },
    });
  }

  // ── Toggle active ────────────────────────────────────────────────────────
  toggleActive(): void {
    const u = this.user();
    if (!u) return;
    this.usersService.setActive(u.id, !u.isActive).subscribe({
      next: () => {
        this.user.update(prev => prev ? { ...prev, isActive: !prev.isActive } : prev);
        this.toast.success(u.isActive ? 'Compte désactivé.' : 'Compte activé.');
      },
      error: () => this.toast.error('Erreur lors du changement de statut.'),
    });
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  submitProfile(): void {
    const u = this.user();
    if (!u) return;
    this.profileLoading.set(true);
    this.usersService.update(u.id, this.profileForm).subscribe({
      next: updated => {
        this.user.set(updated);
        this.profileLoading.set(false);
        this.toast.success('Profil mis à jour.');
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'Erreur lors de la mise à jour.';
        this.toast.error(msg);
        this.profileLoading.set(false);
      },
    });
  }

  // ── Reset password ───────────────────────────────────────────────────────
  openResetPwd(): void {
    this.resetPwdForm = { newPassword: '', confirm: '' };
    this.resetPwdError.set('');
    this.showResetPwd.set(true);
  }

  submitResetPwd(): void {
    const { newPassword, confirm } = this.resetPwdForm;
    if (!newPassword) { this.resetPwdError.set('Le mot de passe ne peut pas être vide.'); return; }
    if (newPassword !== confirm) { this.resetPwdError.set('Les mots de passe ne correspondent pas.'); return; }
    const u = this.user();
    if (!u) return;
    this.resetPwdLoading.set(true);
    this.usersService.resetPassword(u.id, newPassword).subscribe({
      next: () => {
        this.showResetPwd.set(false);
        this.resetPwdLoading.set(false);
        this.toast.success('Mot de passe réinitialisé.');
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'Erreur lors de la réinitialisation.';
        this.resetPwdError.set(msg);
        this.resetPwdLoading.set(false);
      },
    });
  }

  // ── Roles ─────────────────────────────────────────────────────────────────
  assignRole(): void {
    const u    = this.user();
    const role = this.roleToAdd();
    if (!u || !role) return;
    this.roleLoading.set(true);
    this.usersService.assignRole({ userId: u.id, roleName: role }).subscribe({
      next: () => {
        this.user.update(prev => prev ? { ...prev, roles: [...prev.roles, role] } : prev);
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
    const u = this.user();
    if (!u) return;
    this.usersService.removeRole(u.id, roleName).subscribe({
      next: () => {
        this.user.update(prev => prev ? { ...prev, roles: prev.roles.filter(r => r !== roleName) } : prev);
        this.toast.success(`Rôle '${roleName}' retiré.`);
      },
      error: () => this.toast.error('Erreur lors du retrait du rôle.'),
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  confirmDelete(): void {
    const u = this.user();
    if (!u) return;
    this.deleteLoading.set(true);
    this.usersService.delete(u.id).subscribe({
      next: () => {
        this.toast.success(`Utilisateur « ${u.userName} » supprimé définitivement.`);
        this.router.navigate(['/users']);
      },
      error: () => {
        this.toast.error('Erreur lors de la suppression.');
        this.deleteLoading.set(false);
      },
    });
  }
}
