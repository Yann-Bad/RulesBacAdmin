import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="forbidden">
      <div class="code">403</div>
      <h2>Accès refusé</h2>
      <p>Vous n'avez pas les droits SuperAdmin nécessaires pour accéder à cette page.</p>
      <a routerLink="/login" class="btn">Retour à la connexion</a>
    </div>
  `,
  styles: [`
    .forbidden {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      color: #f1f5f9;
      text-align: center;
      padding: 2rem;
    }
    .code {
      font-size: 6rem;
      font-weight: 900;
      color: #f87171;
      line-height: 1;
      margin-bottom: 1rem;
    }
    h2 { font-size: 1.5rem; margin: 0 0 0.75rem; }
    p  { color: #64748b; max-width: 400px; line-height: 1.6; }
    .btn {
      margin-top: 2rem;
      padding: 0.75rem 2rem;
      background: #6366f1;
      color: #fff;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn:hover { background: #4f46e5; }
  `],
})
export class ForbiddenComponent {}
