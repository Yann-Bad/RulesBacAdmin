import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  userName = '';
  password = '';
  loading  = signal(false);
  error    = signal('');

  submit(): void {
    if (this.loading()) return;   // prevent double-submit
    if (!this.userName || !this.password) {
      this.error.set('Identifiant et mot de passe requis.');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.userName, this.password).subscribe({
      next: () => {
        if (!this.auth.isSuperAdmin()) {
          this.auth.logout();
          this.error.set('Accès réservé aux SuperAdmins.');
          this.loading.set(false);
          return;
        }
        this.router.navigate(['/users']);
      },
      error: (err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status === 400) {
          this.error.set('Identifiant ou mot de passe incorrect (ou client non enregistré).');
        } else if (status === 0) {
          this.error.set('Serveur d\'authentification inaccessible.');
        } else {
          this.error.set(`Erreur d'authentification (HTTP ${status ?? '?'}).`);
        }
        this.loading.set(false);
      },
    });
  }
}
