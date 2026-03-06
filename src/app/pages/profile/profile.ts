import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsersService } from '../../services/users.service';
import { ToastService } from '../../services/toast.service';
import type { UserDto, UpdateUserDto } from '../../models/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class ProfileComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly toast        = inject(ToastService);

  user    = signal<UserDto | null>(null);
  loading = signal(true);
  error   = signal('');

  // Edit profile form
  profileForm: UpdateUserDto = {};
  profileLoading = signal(false);

  // Change password form
  pwdForm = { current: '', newPwd: '', confirm: '' };
  pwdError   = signal('');
  pwdLoading = signal(false);

  ngOnInit(): void {
    this.usersService.getMe().subscribe({
      next: user => {
        this.user.set(user);
        this.profileForm = { firstName: user.firstName, lastName: user.lastName, email: user.email };
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger le profil.');
        this.loading.set(false);
      },
    });
  }

  get initials(): string {
    const u = this.user();
    if (!u?.userName) return '?';
    return u.userName.slice(0, 2).toUpperCase();
  }

  // ── Submit profile update ───────────────────────────────────────
  submitProfile(): void {
    this.profileLoading.set(true);
    this.usersService.updateMe(this.profileForm).subscribe({
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

  // ── Submit password change ──────────────────────────────────────
  submitPassword(): void {
    this.pwdError.set('');
    const { current, newPwd, confirm } = this.pwdForm;
    if (!current) { this.pwdError.set('Le mot de passe actuel est requis.'); return; }
    if (!newPwd)  { this.pwdError.set('Le nouveau mot de passe est requis.'); return; }
    if (newPwd !== confirm) { this.pwdError.set('Les mots de passe ne correspondent pas.'); return; }

    this.pwdLoading.set(true);
    this.usersService.changeMyPassword(current, newPwd).subscribe({
      next: () => {
        this.pwdForm = { current: '', newPwd: '', confirm: '' };
        this.pwdLoading.set(false);
        this.toast.success('Mot de passe modifié avec succès.');
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'Erreur lors du changement de mot de passe.';
        this.pwdError.set(msg);
        this.pwdLoading.set(false);
      },
    });
  }
}
