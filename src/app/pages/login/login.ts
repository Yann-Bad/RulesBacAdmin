import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
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
      error: (err: HttpErrorResponse) => {
        if (err.error?.error === 'access_denied') {
          // Authenticated but no roles assigned for this application.
          this.error.set(
            err.error.error_description ?? 'Votre compte n\'a pas encore de rôle attribué pour cette application. Veuillez contacter votre administrateur.'
          );
        } else if (err.status === 400 && err.error?.error === 'invalid_grant') {
          this.error.set('Identifiant ou mot de passe incorrect.');
        } else if (err.status === 0) {
          this.error.set('Serveur d\'authentification inaccessible.');
        } else {
          this.error.set(`Erreur d'authentification (HTTP ${err.status ?? '?'}).`);
        }
        this.loading.set(false);
      },
    });
  }
}
