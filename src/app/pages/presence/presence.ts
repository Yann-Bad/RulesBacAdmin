import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { PresenceService } from '../../services/presence.service';
import type { UserSession } from '../../models/models';

@Component({
  selector: 'app-presence',
  standalone: true,
  templateUrl: './presence.html',
  styleUrl: './presence.css',
})
export class PresenceComponent implements OnInit, OnDestroy {
  private readonly presence = inject(PresenceService);

  readonly sessions   = this.presence.sessions;
  readonly connected  = this.presence.connected;
  readonly connecting = this.presence.connecting;

  // ── Computed stats ─────────────────────────────────────────────────────
  readonly total = computed(() => this.sessions().length);

  readonly byApp = computed(() => {
    const map = new Map<string, number>();
    for (const s of this.sessions()) {
      map.set(s.application, (map.get(s.application) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([app, count]) => ({ app, count }))
      .sort((a, b) => b.count - a.count);
  });

  // ── Filter ──────────────────────────────────────────────────────────────
  filterApp = signal('');

  readonly filtered = computed(() => {
    const app = this.filterApp();
    return app
      ? this.sessions().filter(s => s.application === app)
      : this.sessions();
  });

  // ── Pagination ───────────────────────────────────────────────────────────
  readonly pageSize   = 10;
  readonly page       = signal(1);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly paginated  = computed(() => {
    const p = Math.min(this.page(), this.totalPages()); // clamp after filter shrinks results
    return this.filtered().slice((p - 1) * this.pageSize, p * this.pageSize);
  });

  get pageRange(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  setFilter(app: string): void {
    this.filterApp.set(this.filterApp() === app ? '' : app);
    this.page.set(1);
  }

  prevPage(): void { this.page.update(p => Math.max(1, p - 1)); }
  nextPage(): void { this.page.update(p => Math.min(this.totalPages(), p + 1)); }

  // ── Tick — forces idle-time recomputation every 5 s ─────────────────────
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  readonly tick = signal(0);

  ngOnInit(): void {
    this.presence.start('rubac-admin');
    this.tickTimer = setInterval(() => this.tick.update(n => n + 1), 5_000);
  }

  ngOnDestroy(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    // Keep the hub connected in the background (singleton service).
    // The service is only stopped on logout.
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  idleSeconds(session: UserSession): number {
    void this.tick(); // reactively recompute when tick changes
    return Math.floor((Date.now() - new Date(session.lastSeenAt).getTime()) / 1000);
  }

  idleLabel(session: UserSession): string {
    const s = this.idleSeconds(session);
    if (s < 60)  return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h`;
  }

  statusClass(session: UserSession): string {
    const s = this.idleSeconds(session);
    if (s < 120)  return 'status-online';
    if (s < 300)  return 'status-idle';
    return 'status-away';
  }

  statusLabel(session: UserSession): string {
    const s = this.idleSeconds(session);
    if (s < 120)  return 'En ligne';
    if (s < 300)  return 'Inactif';
    return 'Absent';
  }

  connectedAt(session: UserSession): string {
    return new Date(session.connectedAt).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  appBadgeClass(app: string): string {
    const palette: Record<string, string> = {
      'rubac-admin':   'badge-purple',
      'dashboard-spa': 'badge-blue',
    };
    return `badge ${palette[app] ?? 'badge-default'}`;
  }
}
