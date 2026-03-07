import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { UserDto, RegisterDto, UpdateUserDto, AssignRoleDto, PagedResult, UserApplicationDto, ClientDto } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/users`;

  list(page = 1, pageSize = 10, search = '', sortBy = 'userName', sortDir = 'asc'): Observable<PagedResult<UserDto>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('search', search)
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);
    return this.http.get<PagedResult<UserDto>>(this.base, { params });
  }

  get(id: number): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.base}/${id}`);
  }

  getMe(): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.base}/me`);
  }

  updateMe(dto: UpdateUserDto): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.base}/me`, dto);
  }

  changeMyPassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/me/password`, { currentPassword, newPassword });
  }

  create(dto: RegisterDto): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.base}/register`, dto);
  }

  update(id: number, dto: UpdateUserDto): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.base}/${id}`, dto);
  }

  setActive(id: number, isActive: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/active`, { isActive });
  }

  resetPassword(id: number, newPassword: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/password`, { newPassword });
  }

  assignRole(dto: AssignRoleDto): Observable<void> {
    return this.http.post<void>(`${this.base}/assign-role`, dto);
  }

  removeRole(userId: number, roleName: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${userId}/roles/${roleName}`);
  }

  getApplications(userId: number): Observable<UserApplicationDto[]> {
    return this.http.get<UserApplicationDto[]>(`${this.base}/${userId}/applications`);
  }

  assignApplication(userId: number, clientId: string): Observable<UserApplicationDto> {
    return this.http.post<UserApplicationDto>(`${this.base}/${userId}/applications/${encodeURIComponent(clientId)}`, {});
  }

  removeApplication(userId: number, clientId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${userId}/applications/${encodeURIComponent(clientId)}`);
  }

  /** Returns all registered OIDC clients mapped to UserApplicationDto for the application picker. */
  getAllClients(): Observable<UserApplicationDto[]> {
    return this.http
      .get<ClientDto[]>(`${environment.apiBase}/clients`)
      .pipe(map(clients => clients.map(c => ({ clientId: c.clientId, displayName: c.displayName }))));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
