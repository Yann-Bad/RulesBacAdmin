import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { RolesService } from '../../services/roles.service';
import { ToastService } from '../../services/toast.service';
import type { RoleDto, CreateRoleDto, UpdateRoleDto } from '../../models/models';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './roles.html',
  styleUrl: './roles.css',
})
export class RolesComponent implements OnInit, OnDestroy {
  private readonly rolesService = inject(RolesService);
  private readonly toast        = inject(ToastService);

  roles         = signal<RoleDto[]>([]);
  loading       = signal(true);
  error         = signal('');

  // ── Pagination & search ────────────────────────────────────────────────
  page          = signal(1);
  pageSize      = signal(10);
  totalCount    = signal(0);
  totalPages    = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  pageWindow    = computed<(number | null)[]>(() => {
    const total   = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const show   = new Set([1, total, current - 1, current, current + 1].filter(p => p >= 1 && p <= total));
    const sorted = Array.from(show).sort((a, b) => a - b);
    const result: (number | null)[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(null);
      result.push(sorted[i]);
    }
    return result;
  });
  from          = computed(() => this.totalCount() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1);
  to            = computed(() => Math.min(this.page() * this.pageSize(), this.totalCount()));
  readonly pageSizeOptions = [5, 10, 25, 50];

  private readonly searchInput$ = new Subject<string>();
  private searchSub!: Subscription;
  private currentSearch = '';

  // ── Sorting ───────────────────────────────────────────────────────────────
  sortBy  = signal('name');
  sortDir = signal<'asc' | 'desc'>('asc');
  readonly sortOptions = [
    { label: 'Nom (A–Z)',           value: 'name:asc' },
    { label: 'Nom (Z–A)',           value: 'name:desc' },
    { label: 'Application (A–Z)',   value: 'application:asc' },
    { label: 'Application (Z–A)',   value: 'application:desc' },
  ];

  onSortChange(value: string): void {
    const [col, dir] = value.split(':');
    this.sortBy.set(col);
    this.sortDir.set(dir as 'asc' | 'desc');
    this.page.set(1);
    this.load();
  }

  get currentSortValue(): string {
    return `${this.sortBy()}:${this.sortDir()}`;
  }

  showCreate    = signal(false);
  createForm: CreateRoleDto = { name: '' };
  createError   = signal('');
  createLoading = signal(false);

  deleteTarget  = signal<RoleDto | null>(null);
  deleteLoading = signal(false);

  // Edit modal
  showEdit    = signal(false);
  editTarget  = signal<RoleDto | null>(null);
  editForm: UpdateRoleDto = {};
  editLoading = signal(false);

  ngOnInit(): void {
    this.searchSub = this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ).subscribe(q => {
      this.currentSearch = q;
      this.page.set(1);
      this.load();
    });
    this.load();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.page.set(p);
    this.load();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(+size);
    this.page.set(1);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.rolesService.list(this.page(), this.pageSize(), this.currentSearch, this.sortBy(), this.sortDir()).subscribe({
      next: result => {
        this.roles.set(result.items);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les rôles.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.createForm = { name: '' };
    this.createError.set('');
    this.showCreate.set(true);
  }

  submitCreate(): void {
    if (!this.createForm.name.trim()) {
      this.createError.set('Le nom du rôle est requis.');
      return;
    }
    this.createLoading.set(true);
    this.rolesService.create(this.createForm).subscribe({
      next: () => {
        this.showCreate.set(false);
        this.createLoading.set(false);
        this.toast.success(`Rôle '${this.createForm.name}' créé avec succès.`);
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.error ?? 'Erreur lors de la création du rôle.';
        this.createError.set(msg);
        this.createLoading.set(false);
      },
    });
  }

  confirmDelete(): void {
    const role = this.deleteTarget();
    if (!role) return;
    this.deleteLoading.set(true);
    this.rolesService.delete(role.name).subscribe({
      next: () => {
        this.deleteTarget.set(null);
        this.deleteLoading.set(false);
        this.toast.success(`Rôle '${role.name}' supprimé.`);
        this.load();
      },
      error: () => {
        this.toast.error('Erreur lors de la suppression du rôle.');
        this.deleteLoading.set(false);
      },
    });
  }

  // ── Edit ───────────────────────────────────────────────────────────
  openEdit(role: RoleDto): void {
    this.editTarget.set(role);
    this.editForm = { description: role.description, application: role.application };
    this.showEdit.set(true);
  }

  submitEdit(): void {
    const target = this.editTarget();
    if (!target) return;
    this.editLoading.set(true);
    this.rolesService.update(target.name, this.editForm).subscribe({
      next: updated => {
        this.roles.update(list => list.map(r => r.name === updated.name ? updated : r));
        this.showEdit.set(false);
        this.editLoading.set(false);
        this.toast.success(`Rôle '${updated.name}' mis à jour.`);
      },
      error: () => {
        this.toast.error('Erreur lors de la mise à jour du rôle.');
        this.editLoading.set(false);
      },
    });
  }
}
