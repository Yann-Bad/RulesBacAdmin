import {
  Component, OnInit, OnDestroy, inject, signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { AuditService } from '../../services/audit.service';
import { ToastService } from '../../services/toast.service';
import type { AuditLogDto } from '../../models/models';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './audit.html',
  styleUrl: './audit.css',
})
export class AuditComponent implements OnInit, OnDestroy {
  private readonly auditService = inject(AuditService);
  private readonly toast        = inject(ToastService);

  logs    = signal<AuditLogDto[]>([]);
  loading = signal(true);
  error   = signal('');

  // ── Pagination & search ─────────────────────────────────────────────────
  page       = signal(1);
  pageSize   = signal(25);
  totalCount = signal(0);

  searchTerm   = '';
  entityFilter = '';
  actionFilter = '';

  private readonly search$ = new Subject<string>();
  private sub!: Subscription;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount() / this.pageSize()));
  }

  get pages(): number[] {
    const total = this.totalPages;
    const cur   = this.page();
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) {
      range.push(i);
    }
    return range;
  }

  ngOnInit(): void {
    this.sub = this.search$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
    this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onSearch(): void {
    this.search$.next(this.searchTerm);
  }

  onFilterChange(): void {
    this.page.set(1);
    this.load();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page.set(p);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.auditService.list(
      this.page(),
      this.pageSize(),
      this.searchTerm,
      '',
      this.entityFilter,
      this.actionFilter
    ).subscribe({
      next: result => {
        this.logs.set(result.items);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erreur lors du chargement du journal d\'audit.');
        this.loading.set(false);
      }
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  actionBadgeClass(action: string): string {
    if (action.includes('created'))         return 'badge badge-success';
    if (action.includes('deleted'))         return 'badge badge-danger';
    if (action.includes('deactivated'))     return 'badge badge-warning';
    if (action.includes('activated'))       return 'badge badge-info';
    if (action.includes('password'))        return 'badge badge-purple';
    if (action.includes('role'))            return 'badge badge-blue';
    return 'badge badge-default';
  }
}
