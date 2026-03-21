import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { Observable } from 'rxjs';
import type {
  CreateAdUserDto,
  UpdateAdUserDto,
  SuspendAdUserDto,
  GroupMembershipDto,
  LdapWriteResult,
  AdGroupDto,          // new — returned by search & memberOf queries
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class AdUsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/ad/users`;

  // ── Write operations ──────────────────────────────────────────────────────

  /** POST /api/ad/users — create a new AD account */
  create(dto: CreateAdUserDto): Observable<LdapWriteResult> {
    return this.http.post<LdapWriteResult>(this.base, dto);
  }

  /** PUT /api/ad/users/:sam — update mutable AD attributes */
  update(samAccountName: string, dto: UpdateAdUserDto): Observable<LdapWriteResult> {
    return this.http.put<LdapWriteResult>(`${this.base}/${encodeURIComponent(samAccountName)}`, dto);
  }

  /** POST /api/ad/users/:sam/suspend — disable the account */
  suspend(samAccountName: string, dto: SuspendAdUserDto): Observable<LdapWriteResult> {
    return this.http.post<LdapWriteResult>(
      `${this.base}/${encodeURIComponent(samAccountName)}/suspend`, dto);
  }

  /** POST /api/ad/users/:sam/reactivate — re-enable a suspended account */
  reactivate(samAccountName: string): Observable<LdapWriteResult> {
    return this.http.post<LdapWriteResult>(
      `${this.base}/${encodeURIComponent(samAccountName)}/reactivate`, {});
  }

  /**
   * DELETE /api/ad/users/:sam — permanently delete an account.
   * ⚠️  The account MUST be suspended first; the backend enforces this.
   */
  delete(samAccountName: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(samAccountName)}`);
  }

  // ── Group membership (write) ──────────────────────────────────────────────

  /**
   * POST /api/ad/users/:sam/groups — add user to an AD group.
   * @param groupDn Full DN of the target group (e.g. "CN=GRP_RH,OU=…,DC=cnss,DC=cd")
   */
  addToGroup(samAccountName: string, groupDn: string): Observable<LdapWriteResult> {
    const body: GroupMembershipDto = { groupDn };
    return this.http.post<LdapWriteResult>(
      `${this.base}/${encodeURIComponent(samAccountName)}/groups`, body);
  }

  /**
   * DELETE /api/ad/users/:sam/groups — remove user from an AD group.
   * @param groupDn Full DN of the target group
   */
  removeFromGroup(samAccountName: string, groupDn: string): Observable<LdapWriteResult> {
    const body: GroupMembershipDto = { groupDn };
    return this.http.delete<LdapWriteResult>(
      `${this.base}/${encodeURIComponent(samAccountName)}/groups`, { body });
  }

  // ── Group discovery (read) ────────────────────────────────────────────────

  /**
   * GET /api/ad/users/groups/search?q=<fragment>
   *
   * Returns up to 50 groups whose CN contains the fragment.
   * Used to power the autocomplete dropdown in the "Add to group" panel.
   * The caller should debounce and require ≥ 2 chars before calling this.
   */
  searchGroups(nameFragment: string): Observable<AdGroupDto[]> {
    const params = { q: nameFragment };
    return this.http.get<AdGroupDto[]>(`${this.base}/groups/search`, { params });
  }

  /**
   * GET /api/ad/users/:sam/groups
   *
   * Returns all groups the user is currently a direct member of.
   * Used to populate the "current groups" chip-list in the "Remove from group" panel.
   */
  getUserGroups(samAccountName: string): Observable<AdGroupDto[]> {
    return this.http.get<AdGroupDto[]>(
      `${this.base}/${encodeURIComponent(samAccountName)}/groups`);
  }
}
