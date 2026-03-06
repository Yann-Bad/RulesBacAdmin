import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientsService } from '../../services/clients.service';
import { ToastService } from '../../services/toast.service';
import type { ClientDto, CreateClientDto, UpdateClientDto } from '../../models/models';

// ── Permission presets ──────────────────────────────────────────────────────
const BASE_PERMISSIONS = [
  'ept:token',
  'gt:password',
  'gt:refresh_token',
  'scp:openid',
  'scp:profile',
  'scp:email',
  'scp:roles',
  'scp:offline_access',
];

type ModalMode = 'create' | 'edit' | 'perms';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './clients.html',
  styleUrl: './clients.css',
})
export class ClientsComponent implements OnInit {
  private readonly svc   = inject(ClientsService);
  private readonly toast = inject(ToastService);

  clients = signal<ClientDto[]>([]);
  loading = signal(true);
  error   = signal('');

  // ── Modal state ─────────────────────────────────────────────────────────
  modalMode    = signal<ModalMode | null>(null);
  saving       = signal(false);
  deleteTarget = signal<ClientDto | null>(null);
  showDelete   = signal(false);

  // ── Create / Edit form ──────────────────────────────────────────────────
  form: CreateClientDto = this.emptyForm();
  editingId = '';

  // ── Permission editing ──────────────────────────────────────────────────
  permClient: ClientDto | null = null;
  permLines   = '';   // newline-separated list, edited as textarea

  readonly presetPermissions = BASE_PERMISSIONS;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.svc.list().subscribe({
      next: list => { this.clients.set(list); this.loading.set(false); },
      error: () => { this.error.set('Erreur lors du chargement des clients.'); this.loading.set(false); },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private emptyForm(): CreateClientDto {
    return {
      clientId:    '',
      displayName: '',
      clientType:  'public',
      clientSecret: '',
      permissions:  [...BASE_PERMISSIONS],
      redirectUris: [],
    };
  }

  typeBadge(type: string): string {
    return type === 'confidential' ? 'badge badge-blue' : 'badge badge-success';
  }

  permCount(client: ClientDto): number { return client.permissions.length; }

  // ── Create ───────────────────────────────────────────────────────────────
  openCreate(): void {
    this.form = this.emptyForm();
    this.editingId = '';
    this.modalMode.set('create');
  }

  // ── Edit ────────────────────────────────────────────────────────────────
  openEdit(client: ClientDto): void {
    this.editingId = client.clientId;
    this.form = {
      clientId:     client.clientId,
      displayName:  client.displayName ?? '',
      clientType:   client.clientType,
      clientSecret: '',
      permissions:  [...client.permissions],
      redirectUris: [...client.redirectUris],
    };
    this.modalMode.set('edit');
  }

  // ── Permissions detail ──────────────────────────────────────────────────
  openPerms(client: ClientDto): void {
    this.permClient = client;
    this.permLines  = client.permissions.join('\n');
    this.modalMode.set('perms');
  }

  savePerms(): void {
    if (!this.permClient) return;
    const perms = this.permLines
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    const dto: UpdateClientDto = {
      displayName:  this.permClient.displayName,
      permissions:  perms,
      redirectUris: [...this.permClient.redirectUris],
    };
    this.saving.set(true);
    this.svc.update(this.permClient.clientId, dto).subscribe({
      next: () => {
        this.toast.success('Permissions mises à jour.');
        this.modalMode.set(null);
        this.saving.set(false);
        this.load();
      },
      error: () => {
        this.toast.error('Erreur lors de la mise à jour des permissions.');
        this.saving.set(false);
      },
    });
  }

  applyPreset(): void {
    const existing = new Set(this.permLines.split('\n').map(l => l.trim()).filter(Boolean));
    for (const p of BASE_PERMISSIONS) existing.add(p);
    this.permLines = [...existing].join('\n');
  }

  closeModal(): void { this.modalMode.set(null); }

  submit(): void {
    if (this.saving()) return;
    this.saving.set(true);

    if (this.modalMode() === 'create') {
      this.svc.create(this.form).subscribe({
        next: created => {
          this.toast.success(`Client "${created.clientId}" créé.`);
          this.modalMode.set(null);
          this.saving.set(false);
          this.load();
        },
        error: err => {
          this.toast.error(err?.error ?? 'Erreur lors de la création.');
          this.saving.set(false);
        },
      });
    } else {
      const dto: UpdateClientDto = {
        displayName:  this.form.displayName,
        clientSecret: this.form.clientSecret || undefined,
        permissions:  this.form.permissions,
        redirectUris: this.form.redirectUris,
      };
      this.svc.update(this.editingId, dto).subscribe({
        next: () => {
          this.toast.success('Client mis à jour.');
          this.modalMode.set(null);
          this.saving.set(false);
          this.load();
        },
        error: () => {
          this.toast.error('Erreur lors de la mise à jour.');
          this.saving.set(false);
        },
      });
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  confirmDelete(client: ClientDto): void {
    this.deleteTarget.set(client);
    this.showDelete.set(true);
  }

  cancelDelete(): void { this.showDelete.set(false); this.deleteTarget.set(null); }

  doDelete(): void {
    const c = this.deleteTarget();
    if (!c) return;
    this.svc.delete(c.clientId).subscribe({
      next: () => {
        this.toast.success(`Client "${c.clientId}" supprimé.`);
        this.showDelete.set(false);
        this.deleteTarget.set(null);
        this.load();
      },
      error: () => this.toast.error('Erreur lors de la suppression.'),
    });
  }

  // ── Redirect URI helpers ─────────────────────────────────────────────────
  uriInput = '';

  addUri(): void {
    const v = this.uriInput.trim();
    if (!v) return;
    if (!this.form.redirectUris.includes(v)) this.form.redirectUris = [...this.form.redirectUris, v];
    this.uriInput = '';
  }

  removeUri(uri: string): void {
    this.form.redirectUris = this.form.redirectUris.filter(u => u !== uri);
  }
}
