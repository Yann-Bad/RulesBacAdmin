import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PresenceService } from '../services/presence.service';
import { ToastComponent } from './toast/toast';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class LayoutComponent implements OnInit, OnDestroy {
  readonly auth            = inject(AuthService);
  private  readonly presence = inject(PresenceService);
  readonly currentUser     = this.auth.currentUser;

  readonly userInitials = computed(() => {
    const u = this.currentUser();
    if (!u?.userName) return '?';
    return u.userName.slice(0, 2).toUpperCase();
  });

  menuOpen = signal(false);

  ngOnInit(): void {
    // Start the SignalR hub as soon as the authenticated layout is rendered.
    // The service is a singleton so subsequent calls are no-ops.
    this.presence.start('rubac-admin');
  }

  ngOnDestroy(): void {
    this.presence.stop();
  }

  toggleMenu(): void { this.menuOpen.update(v => !v); }
  closeMenu(): void  { this.menuOpen.set(false); }
  logout(): void     { this.presence.stop(); this.auth.logout(); }
}
