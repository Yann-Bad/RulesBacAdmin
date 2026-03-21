import {
  Component, inject, signal, OnInit, OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { AdUsersService } from '../../services/ad-users.service';
import { ToastService } from '../../services/toast.service';
import type {
  CreateAdUserDto,
  UpdateAdUserDto,
  SuspendAdUserDto,
  AdGroupDto,
} from '../../models/models';

type ActiveTab = 'create' | 'manage';

@Component({
  selector: 'app-ad-users',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ad-users.html',
  styleUrl: './ad-users.css',
})
export class AdUsersComponent implements OnInit, OnDestroy {
  private readonly adService = inject(AdUsersService);
  private readonly toast     = inject(ToastService);

  // Rxjs subscriptions — cleaned up in ngOnDestroy
  private readonly subs = new Subscription();

  // ── Tab state ─────────────────────────────────────────────────────────────
  activeTab = signal<ActiveTab>('create');

  // ── Create form ───────────────────────────────────────────────────────────
  createLoading = signal(false);
  createForm: CreateAdUserDto = this.emptyCreate();

  emptyCreate(): CreateAdUserDto {
    return {
      samAccountName:           '',
      displayName:              '',
      givenName:                '',
      surname:                  '',
      email:                    '',
      password:                 '',
      mustChangePasswordOnLogin: true,
      description:              '',
    };
  }

  submitCreate(): void {
    if (!this.createForm.samAccountName.trim() || !this.createForm.displayName.trim()) {
      this.toast.error('sAMAccountName et nom complet sont obligatoires.');
      return;
    }
    this.createLoading.set(true);
    this.adService.create(this.createForm).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.createForm = this.emptyCreate();
        this.createLoading.set(false);
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la création du compte AD.');
        this.createLoading.set(false);
      },
    });
  }

  // ── Manage: target account ────────────────────────────────────────────────
  manageSam = signal('');   // sAMAccountName being managed
  samInput  = '';            // bound to the text input

  setManageTarget(): void {
    const v = this.samInput.trim();
    if (!v) { this.toast.error('Entrez un sAMAccountName.'); return; }
    this.manageSam.set(v);
    // Close all sub-panels and reset group state
    this.closeAllPanels();
  }

  clearTarget(): void {
    this.manageSam.set('');
    this.samInput = '';
    this.closeAllPanels();
  }

  // ── Update ────────────────────────────────────────────────────────────────
  showUpdate    = signal(false);
  updateLoading = signal(false);
  updateForm: UpdateAdUserDto = {};

  openUpdate(): void {
    this.updateForm = {};
    this.showUpdate.set(true);
    this.showSuspend.set(false);
    this.showGroupAdd.set(false);
    this.showGroupRem.set(false);
    this.showDelete.set(false);
  }

  submitUpdate(): void {
    this.updateLoading.set(true);
    this.adService.update(this.manageSam(), this.updateForm).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.showUpdate.set(false);
        this.updateLoading.set(false);
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la mise à jour.');
        this.updateLoading.set(false);
      },
    });
  }

  // ── Suspend ───────────────────────────────────────────────────────────────
  showSuspend    = signal(false);
  suspendLoading = signal(false);
  suspendForm: SuspendAdUserDto = { reason: '' };

  openSuspend(): void {
    this.suspendForm = { reason: '' };
    this.showSuspend.set(true);
    this.showUpdate.set(false);
    this.showGroupAdd.set(false);
    this.showGroupRem.set(false);
    this.showDelete.set(false);
  }

  submitSuspend(): void {
    if (!this.suspendForm.reason.trim()) {
      this.toast.error('La raison de suspension est obligatoire.');
      return;
    }
    this.suspendLoading.set(true);
    this.adService.suspend(this.manageSam(), this.suspendForm).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.showSuspend.set(false);
        this.suspendLoading.set(false);
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la suspension.');
        this.suspendLoading.set(false);
      },
    });
  }

  // ── Reactivate ────────────────────────────────────────────────────────────
  reactivateLoading = signal(false);

  submitReactivate(): void {
    if (!confirm(`Réactiver le compte « ${this.manageSam()} » ?`)) return;
    this.reactivateLoading.set(true);
    this.adService.reactivate(this.manageSam()).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.reactivateLoading.set(false);
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la réactivation.');
        this.reactivateLoading.set(false);
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  showDelete    = signal(false);
  deleteLoading = signal(false);
  deleteConfirm = '';

  openDelete(): void {
    this.deleteConfirm = '';
    this.showDelete.set(true);
    this.showUpdate.set(false);
    this.showSuspend.set(false);
    this.showGroupAdd.set(false);
    this.showGroupRem.set(false);
  }

  submitDelete(): void {
    if (this.deleteConfirm !== this.manageSam()) {
      this.toast.error('Confirmation incorrecte — saisissez le sAMAccountName exact.');
      return;
    }
    this.deleteLoading.set(true);
    this.adService.delete(this.manageSam()).subscribe({
      next: () => {
        this.toast.success(`Compte « ${this.manageSam()} » supprimé définitivement.`);
        this.clearTarget();
        this.deleteLoading.set(false);
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la suppression.');
        this.deleteLoading.set(false);
      },
    });
  }

  // ── Group membership — Add panel ──────────────────────────────────────────
  //
  // The user types a name fragment (≥2 chars) into a search input.
  // A Subject pipes the input through debounceTime + switchMap so only the
  // latest request is alive — avoids race conditions.
  // Once a group is selected from the dropdown, it shows in a chip.
  // The "Ajouter" button is only enabled when a group is selected.

  showGroupAdd     = signal(false);
  addLoading       = signal(false);
  addSearchInput   = '';                            // bound to the <input>
  addSuggestions   = signal<AdGroupDto[]>([]);      // autocomplete dropdown items
  addSearching     = signal(false);                 // spinner while searching
  selectedGroupAdd = signal<AdGroupDto | null>(null); // confirmed selection

  /** Subject that drives the debounced group search for the Add panel. */
  private readonly addSearch$ = new Subject<string>();

  // ── Group membership — Remove panel ──────────────────────────────────────
  //
  // When opened, the user's current groups are loaded from the API and shown
  // as clickable chips — one click pre-fills the remove operation.
  // A fallback search input lets the user find groups not visible in the list.

  showGroupRem      = signal(false);
  removeLoading     = signal(false);
  userGroups        = signal<AdGroupDto[]>([]);         // current memberships
  loadingUserGroups = signal(false);
  remSearchInput    = '';                               // fallback search input
  remSuggestions    = signal<AdGroupDto[]>([]);
  remSearching      = signal(false);
  selectedGroupRem  = signal<AdGroupDto | null>(null);  // group to remove

  /** Subject for the debounced search in the Remove panel. */
  private readonly remSearch$ = new Subject<string>();

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Wire up the Add-panel search debounce:
    //   – wait 300 ms after last keystroke (debounceTime)
    //   – skip if value hasn't changed (distinctUntilChanged)
    //   – cancel previous HTTP if user keeps typing (switchMap)
    this.subs.add(
      this.addSearch$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(q => {
          if (q.length < 2) {
            this.addSuggestions.set([]);
            this.addSearching.set(false);
            return [];
          }
          this.addSearching.set(true);
          return this.adService.searchGroups(q);
        }),
      ).subscribe({
        next:  groups => { this.addSuggestions.set(groups); this.addSearching.set(false); },
        error: err    => {
          this.toast.error(err?.error?.message ?? 'Erreur de recherche de groupe.');
          this.addSearching.set(false);
        },
      }),
    );

    // Same pipeline for the Remove panel fallback search
    this.subs.add(
      this.remSearch$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(q => {
          if (q.length < 2) {
            this.remSuggestions.set([]);
            this.remSearching.set(false);
            return [];
          }
          this.remSearching.set(true);
          return this.adService.searchGroups(q);
        }),
      ).subscribe({
        next:  groups => { this.remSuggestions.set(groups); this.remSearching.set(false); },
        error: err    => {
          this.toast.error(err?.error?.message ?? 'Erreur de recherche de groupe.');
          this.remSearching.set(false);
        },
      }),
    );
  }

  ngOnDestroy(): void {
    // Prevent memory leaks — unsubscribe all rxjs subscriptions when component
    // is destroyed (e.g. route navigation away)
    this.subs.unsubscribe();
  }

  // ── Group panel helpers ───────────────────────────────────────────────────

  /** Opens the "Add to group" panel and resets its state. */
  openGroupAdd(): void {
    this.resetAddPanel();
    this.showGroupAdd.set(true);
    this.showGroupRem.set(false);
    this.showUpdate.set(false);
    this.showSuspend.set(false);
    this.showDelete.set(false);
  }

  /**
   * Opens the "Remove from group" panel and immediately loads
   * the user's current groups so chips are ready.
   */
  openGroupRem(): void {
    this.resetRemPanel();
    this.showGroupRem.set(true);
    this.showGroupAdd.set(false);
    this.showUpdate.set(false);
    this.showSuspend.set(false);
    this.showDelete.set(false);
    this.loadUserGroups();
  }

  /**
   * Called whenever the Add search input changes.
   * Clears the current selection (user may want a different group)
   * and pushes the value into the debounce pipeline.
   */
  onAddSearchChange(): void {
    this.selectedGroupAdd.set(null);
    this.addSearch$.next(this.addSearchInput);
  }

  /** Called when the Remove fallback search input changes. */
  onRemSearchChange(): void {
    this.selectedGroupRem.set(null);
    this.remSearch$.next(this.remSearchInput);
  }

  /**
   * Selects a group from the Add autocomplete dropdown.
   * Collapses the dropdown and shows the selection chip.
   */
  selectGroupAdd(group: AdGroupDto): void {
    this.selectedGroupAdd.set(group);
    this.addSuggestions.set([]);       // close dropdown
    this.addSearchInput = group.name;  // reflect name in the input for clarity
  }

  /**
   * Selects a group from the Remove dropdown / chip.
   * Called either from the fallback autocomplete or from a current-groups chip.
   */
  selectGroupRem(group: AdGroupDto): void {
    this.selectedGroupRem.set(group);
    this.remSuggestions.set([]);
    this.remSearchInput = group.name;
  }

  /**
   * Quick-selects a group from the current-memberships chip list
   * in the Remove panel. This is the primary UX flow — no typing needed.
   */
  quickSelectForRemove(group: AdGroupDto): void {
    this.selectGroupRem(group);
  }

  /** Submits the "add to group" request. */
  submitAddGroup(): void {
    const group = this.selectedGroupAdd();
    if (!group) { this.toast.error('Sélectionnez un groupe dans la liste.'); return; }

    this.addLoading.set(true);
    this.adService.addToGroup(this.manageSam(), group.dn).subscribe({
      next: res => {
        this.toast.success(res.message);
        this.resetAddPanel();
        this.showGroupAdd.set(false);
        this.addLoading.set(false);
      },
      error: err => {
        this.toast.error(err?.error?.message ?? "Erreur lors de l'ajout au groupe.");
        this.addLoading.set(false);
      },
    });
  }

  /** Submits the "remove from group" request. */
  submitRemoveGroup(): void {
    const group = this.selectedGroupRem();
    if (!group) { this.toast.error('Sélectionnez un groupe à retirer.'); return; }

    this.removeLoading.set(true);
    this.adService.removeFromGroup(this.manageSam(), group.dn).subscribe({
      next: res => {
        this.toast.success(res.message);
        // Refresh the current-groups chips after a successful removal
        this.loadUserGroups();
        this.resetRemPanel();
        this.removeLoading.set(false);
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Erreur lors du retrait du groupe.');
        this.removeLoading.set(false);
      },
    });
  }

  /** Fetches the user's current AD group memberships. */
  private loadUserGroups(): void {
    this.loadingUserGroups.set(true);
    this.adService.getUserGroups(this.manageSam()).subscribe({
      next:  groups => { this.userGroups.set(groups); this.loadingUserGroups.set(false); },
      error: err    => {
        this.toast.error(err?.error?.message ?? 'Impossible de charger les groupes.');
        this.loadingUserGroups.set(false);
      },
    });
  }

  /** Resets Add-panel transient state (search input, dropdown, selection). */
  private resetAddPanel(): void {
    this.addSearchInput = '';
    this.addSuggestions.set([]);
    this.selectedGroupAdd.set(null);
  }

  /** Resets Remove-panel transient state. */
  private resetRemPanel(): void {
    this.remSearchInput = '';
    this.remSuggestions.set([]);
    this.selectedGroupRem.set(null);
    this.userGroups.set([]);
  }

  /** Closes all sub-panels and resets group state. */
  private closeAllPanels(): void {
    this.showUpdate.set(false);
    this.showSuspend.set(false);
    this.showGroupAdd.set(false);
    this.showGroupRem.set(false);
    this.showDelete.set(false);
    this.resetAddPanel();
    this.resetRemPanel();
  }
}
