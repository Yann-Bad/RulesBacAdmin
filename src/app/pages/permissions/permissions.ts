import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PermissionsService } from '../../services/permissions.service';
import { ToastService } from '../../services/toast.service';
import type { PermissionDto, CreatePermissionDto } from '../../models/models';

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './permissions.html',
  styleUrl: './permissions.css',
})
export class PermissionsComponent implements OnInit {
  private readonly svc   = inject(PermissionsService);
  private readonly toast = inject(ToastService);

  permissions     = signal<PermissionDto[]>([]);
  loading         = signal(true);
  error           = signal('');
  appFilter       = signal('');

  readonly knownApplications = ['RubacCore', 'Dashboard'];

  filtered = computed(() => {
    const f = this.appFilter().toLowerCase();
    return f
      ? this.permissions().filter(p => p.application.toLowerCase() === f)
      : this.permissions();
  });

  // ── Create modal ───────────────────────────────────────────────────
  showCreate    = signal(false);
  createForm: CreatePermissionDto = { name: '', application: '', description: '' };
  createError   = signal('');
  createLoading = signal(false);

  // ── Delete confirm ─────────────────────────────────────────────────
  deleteTarget  = signal<PermissionDto | null>(null);
  deleteLoading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.svc.list().subscribe({
      next: list => {
        this.permissions.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les permissions.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.createForm = { name: '', application: '', description: '' };
    this.createError.set('');
    this.showCreate.set(true);
  }

  submitCreate(): void {
    if (!this.createForm.name.trim()) {
      this.createError.set('Le nom de la permission est requis.');
      return;
    }
    if (!this.createForm.application.trim()) {
      this.createError.set('L\'application est requise.');
      return;
    }
    this.createLoading.set(true);
    this.svc.create(this.createForm).subscribe({
      next: created => {
        this.permissions.update(list => [...list, created].sort((a, b) =>
          a.application.localeCompare(b.application) || a.name.localeCompare(b.name)
        ));
        this.showCreate.set(false);
        this.createLoading.set(false);
        this.toast.success(`Permission '${created.name}' créée.`);
      },
      error: err => {
        this.createError.set(err?.error?.error ?? 'Erreur lors de la création.');
        this.createLoading.set(false);
      },
    });
  }

  confirmDelete(): void {
    const p = this.deleteTarget();
    if (!p) return;
    this.deleteLoading.set(true);
    this.svc.delete(p.id).subscribe({
      next: () => {
        this.permissions.update(list => list.filter(x => x.id !== p.id));
        this.deleteTarget.set(null);
        this.deleteLoading.set(false);
        this.toast.success(`Permission '${p.name}' supprimée.`);
      },
      error: () => {
        this.toast.error('Erreur lors de la suppression.');
        this.deleteLoading.set(false);
      },
    });
  }
}
