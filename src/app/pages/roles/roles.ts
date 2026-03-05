import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { RolesService } from '../../services/roles.service';
import type { RoleDto, CreateRoleDto } from '../../models/models';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './roles.html',
  styleUrl: './roles.css',
})
export class RolesComponent implements OnInit, OnDestroy {
  private readonly rolesService = inject(RolesService);

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

  showCreate    = signal(false);
  createForm: CreateRoleDto = { name: '' };
  createError   = signal('');
  createLoading = signal(false);

  deleteTarget  = signal<RoleDto | null>(null);
  deleteLoading = signal(false);

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
    this.rolesService.list(this.page(), this.pageSize(), this.currentSearch).subscribe({
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
        this.load();
      },
      error: () => {
        this.createError.set('Erreur lors de la création du rôle.');
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
        this.load();
      },
      error: () => this.deleteLoading.set(false),
    });
  }
}
