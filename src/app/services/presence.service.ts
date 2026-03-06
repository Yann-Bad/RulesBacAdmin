import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';
import type { UserSession } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PresenceService implements OnDestroy {
  private readonly auth = inject(AuthService);

  private connection: signalR.HubConnection | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // ── Public signals ────────────────────────────────────────────────────────
  readonly sessions    = signal<UserSession[]>([]);
  readonly connected   = signal(false);
  readonly connecting  = signal(false);

  // ── Start / Stop ─────────────────────────────────────────────────────────

  async start(application: string): Promise<void> {
    if (this.connection) return; // already started

    this.connecting.set(true);

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/presence', {
        // SignalR reads the token from query string when WebSockets are used.
        // The backend middleware promotes it to the Authorization header.
        accessTokenFactory: () => this.auth.getAccessToken() ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // ── Event handlers ──────────────────────────────────────────────────────

    this.connection.on('SnapshotReceived', (snapshot: UserSession[]) => {
      this.sessions.set(snapshot);
    });

    this.connection.on('UserJoined', (session: UserSession) => {
      this.sessions.update(list => [
        ...list.filter(s => s.connectionId !== session.connectionId),
        session,
      ]);
    });

    this.connection.on('UserLeft', (connectionId: string) => {
      this.sessions.update(list => list.filter(s => s.connectionId !== connectionId));
    });

    this.connection.on('UserUpdated', (session: UserSession) => {
      this.sessions.update(list =>
        list.map(s => s.connectionId === session.connectionId ? session : s)
      );
    });

    this.connection.onreconnected(() => {
      this.connected.set(true);
      // Re-announce after reconnection
      this.connection?.invoke('Announce', application).catch(() => {});
    });

    this.connection.onclose(() => {
      this.connected.set(false);
      this.sessions.set([]);
    });

    // ── Connect ─────────────────────────────────────────────────────────────
    try {
      await this.connection.start();
      this.connected.set(true);
      this.connecting.set(false);
      await this.connection.invoke('Announce', application);

      // Heartbeat every 30 s
      this.heartbeatTimer = setInterval(async () => {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
          await this.connection.invoke('Heartbeat').catch(() => {});
        }
      }, 30_000);
    } catch {
      this.connecting.set(false);
      this.connection = null;
    }
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
    this.connected.set(false);
    this.sessions.set([]);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
