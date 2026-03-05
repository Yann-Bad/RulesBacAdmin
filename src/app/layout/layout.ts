import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class LayoutComponent {
  readonly auth            = inject(AuthService);
  readonly currentUser     = this.auth.currentUser;

  readonly userInitials = computed(() => {
    const u = this.currentUser();
    if (!u?.userName) return '?';
    return u.userName.slice(0, 2).toUpperCase();
  });

  menuOpen = signal(false);

  toggleMenu(): void { this.menuOpen.update(v => !v); }
  closeMenu(): void  { this.menuOpen.set(false); }
  logout(): void     { this.auth.logout(); }
}
