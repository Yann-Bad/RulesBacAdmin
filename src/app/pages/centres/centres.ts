import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { CentresService } from '../../services/centres.service';
import { UsersService }   from '../../services/users.service';
import { ToastService }   from '../../services/toast.service';
import type {
  CentreDto, CreateCentreDto, UpdateCentreDto,
  UserDto, AssignUserCentreDto, CentreUserDto, PagedResult,
  CodeSubdivisionCentre,
} from '../../models/models';
import { SUBDIVISION_LABELS, SUBDIVISION_OPTIONS } from '../../models/models';

@Component({
  selector: 'app-centres',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './centres.html',
  styleUrl: './centres.css',
})
export class CentresComponent implements OnInit, OnDestroy {
  private readonly centresService = inject(CentresService);
  private readonly usersService   = inject(UsersService);
  private readonly toast          = inject(ToastService);

  centres = signal<CentreDto[]>([]);
  loading = signal(true);
  error   = signal('');

  readonly subdivisionOptions = SUBDIVISION_OPTIONS;
  readonly subdivisionLabels  = SUBDIVISION_LABELS;

  // â”€â”€ Search / filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  search = signal('');

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.centres();
    return this.centres().filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      SUBDIVISION_LABELS[c.subdivisionAdministrative].toLowerCase().includes(q)
    );
  });

  // â”€â”€ Create / Edit modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  showModal = signal(false);
  editingId = signal<number | null>(null);

  form = {
    code:                      '',
    name:                      '',
    isActive:                  true,
    subdivisionAdministrative: 'PROVINCE' as CodeSubdivisionCentre,
    parentId:                  null as number | null,
  };

  get modalTitle(): string {
    return this.editingId() === null ? 'Nouveau centre' : 'Modifier le centre';
  }

  // ── Assigned-users list (server-side pagination + search) ──────────────
  showAssignModal    = signal(false);
  assignCentreId     = signal<number | null>(null);
  centreUsersPage    = signal<PagedResult<CentreUserDto> | null>(null);
  centreUsersLoading = signal(false);

  private readonly centreUserSearch$ = new Subject<string>();
  centreUserSearchQuery = signal('');
  centreUserCurrentPage = signal(1);
  readonly centreUsersPageSize = 15;

  centreUserTotalPages = computed(() => {
    const p = this.centreUsersPage();
    if (!p) return 1;
    return Math.max(1, Math.ceil(p.totalCount / this.centreUsersPageSize));
  });

  centreUserTotalCount = computed(() => this.centreUsersPage()?.totalCount ?? 0);
  // â”€â”€ User live-search (debounced, server-side) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private readonly userSearch$ = new Subject<string>();

  userSearchQuery   = signal('');
  userSearchResults = signal<UserDto[]>([]);
  userSearchLoading = signal(false);
  assignUserId      = signal<number | null>(null);
  assignUserName    = signal('');
  assignIsPrimary   = signal(false);

  get assignCentreName(): string {
    const c = this.centres().find(x => x.id === this.assignCentreId());
    return c ? (c.name ?? c.code ?? String(c.id)) : '';
  }

  // â”€â”€ Delete confirm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  deletingId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadCentres();

    // Debounced search for centre's assigned users list
    this.centreUserSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ).subscribe(q => {
      this.centreUserCurrentPage.set(1);
      this.loadCentreUsers(q, 1);
    });

    // Debounced user picker search
    this.userSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => {
        this.userSearchLoading.set(true);
        return this.usersService.list(1, 20, q);
      }),
    ).subscribe({
      next:  r  => { this.userSearchResults.set(r.items); this.userSearchLoading.set(false); },
      error: () => this.userSearchLoading.set(false),
    });
  }

  ngOnDestroy(): void {
    this.userSearch$.complete();
    this.centreUserSearch$.complete();
  }

  private loadCentres(): void {
    this.loading.set(true);
    this.centresService.list().subscribe({
      next:  cs  => { this.centres.set(cs); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.detail ?? 'Erreur de chargement'); this.loading.set(false); },
    });
  }

  onSearch(val: string): void { this.search.set(val); }

  // â”€â”€ CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  openCreate(): void {
    this.editingId.set(null);
    this.form = { code: '', name: '', isActive: true, subdivisionAdministrative: 'PROVINCE', parentId: null };
    this.showModal.set(true);
  }

  openEdit(c: CentreDto): void {
    this.editingId.set(c.id);
    this.form = {
      code:                      c.code ?? '',
      name:                      c.name ?? '',
      isActive:                  c.isActive,
      subdivisionAdministrative: c.subdivisionAdministrative,
      parentId:                  c.parentId ?? null,
    };
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  save(): void {
    const id = this.editingId();
    const payload: CreateCentreDto | UpdateCentreDto = {
      code:                      this.form.code || undefined,
      name:                      this.form.name || undefined,
      isActive:                  this.form.isActive,
      subdivisionAdministrative: this.form.subdivisionAdministrative,
      parentId:                  this.form.parentId,
    };

    if (id === null) {
      this.centresService.create(payload as CreateCentreDto).subscribe({
        next: c => {
          this.centres.update(cs => [...cs, c]);
          this.showModal.set(false);
          this.toast.success(`Centre "${c.name ?? c.code}" crÃ©Ã©.`);
        },
        error: err => this.toast.error(err?.error?.detail ?? 'Erreur lors de la crÃ©ation'),
      });
    } else {
      this.centresService.update(id, payload as UpdateCentreDto).subscribe({
        next: c => {
          this.centres.update(cs => cs.map(x => x.id === id ? c : x));
          this.showModal.set(false);
          this.toast.success(`Centre "${c.name ?? c.code}" mis Ã  jour.`);
        },
        error: err => this.toast.error(err?.error?.detail ?? 'Erreur lors de la mise Ã  jour'),
      });
    }
  }

  confirmDelete(id: number): void { this.deletingId.set(id); }
  cancelDelete():           void { this.deletingId.set(null); }

  deleteConfirmed(): void {
    const id = this.deletingId();
    if (id === null) return;
    this.centresService.delete(id).subscribe({
      next: () => {
        this.centres.update(cs => cs.filter(c => c.id !== id));
        this.deletingId.set(null);
        this.toast.success('Centre supprimÃ©.');
      },
      error: err => {
        this.toast.error(err?.error?.detail ?? 'Impossible de supprimer ce centre.');
        this.deletingId.set(null);
      },
    });
  }

  // â”€â”€ Assign modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  openAssign(centreId: number): void {
    this.assignCentreId.set(centreId);
    this.centreUsersPage.set(null);
    this.centreUserSearchQuery.set('');
    this.centreUserCurrentPage.set(1);
    this.resetUserPicker();
    this.showAssignModal.set(true);
    this.loadCentreUsers('', 1);
  }

  closeAssignModal(): void { this.showAssignModal.set(false); }

  private loadCentreUsers(search: string, page: number): void {
    const centreId = this.assignCentreId();
    if (centreId === null) return;
    this.centreUsersLoading.set(true);
    this.centresService.getUsersForCentre(centreId, page, this.centreUsersPageSize, search).subscribe({
      next:  r  => { this.centreUsersPage.set(r); this.centreUsersLoading.set(false); },
      error: () => this.centreUsersLoading.set(false),
    });
  }

  onCentreUserSearchChange(q: string): void {
    this.centreUserSearchQuery.set(q);
    this.centreUserSearch$.next(q);
  }

  setCentreUserPage(p: number): void {
    this.centreUserCurrentPage.set(p);
    this.loadCentreUsers(this.centreUserSearchQuery(), p);
  }

  // User live-search
  onUserSearchChange(q: string): void {
    this.userSearchQuery.set(q);
    this.assignUserId.set(null);
    this.assignUserName.set('');
    if (q.trim().length >= 2) {
      this.userSearch$.next(q.trim());
    } else {
      this.userSearchResults.set([]);
    }
  }

  selectUser(u: UserDto): void {
    this.assignUserId.set(u.id);
    this.assignUserName.set(u.userName);
    this.userSearchQuery.set(u.userName);
    this.userSearchResults.set([]);
  }

  clearSelectedUser(): void {
    this.resetUserPicker();
  }

  private resetUserPicker(): void {
    this.assignUserId.set(null);
    this.assignUserName.set('');
    this.assignIsPrimary.set(false);
    this.userSearchQuery.set('');
    this.userSearchResults.set([]);
  }

  saveAssign(): void {
    const centreId = this.assignCentreId();
    const userId   = this.assignUserId();
    if (centreId === null || userId === null) return;

    const dto: AssignUserCentreDto = { userId, centreId, isPrimary: this.assignIsPrimary() };
    this.centresService.assign(dto).subscribe({
      next: () => {
        this.toast.success('Utilisateur affecté au centre.');
        this.resetUserPicker();
        this.centreUserCurrentPage.set(1);
        this.loadCentreUsers(this.centreUserSearchQuery(), 1);
      },
      error: err => this.toast.error(err?.error?.detail ?? 'Erreur lors de l\'affectation'),
    });
  }

  removeFromCentre(userId: number, centreId: number): void {
    this.centresService.unassign(userId, centreId).subscribe({
      next: () => {
        this.toast.success('Utilisateur retiré du centre.');
        this.loadCentreUsers(this.centreUserSearchQuery(), this.centreUserCurrentPage());
      },
      error: err => this.toast.error(err?.error?.detail ?? 'Impossible de retirer cet utilisateur.'),
    });
  }

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  parentOptions(excludeId: number | null): CentreDto[] {
    return this.centres().filter(c => c.id !== excludeId);
  }

  subdivisionLabel(s: CodeSubdivisionCentre): string {
    return SUBDIVISION_LABELS[s] ?? s;
  }
}
