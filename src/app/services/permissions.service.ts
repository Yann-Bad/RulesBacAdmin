import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { PermissionDto, CreatePermissionDto, AssignPermissionDto } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/rubac/permissions';

  list(application?: string): Observable<PermissionDto[]> {
    const params: Record<string, string> = {};
    if (application) params['application'] = application;
    return this.http.get<PermissionDto[]>(this.base, { params });
  }

  getForRole(roleId: number): Observable<PermissionDto[]> {
    return this.http.get<PermissionDto[]>(`${this.base}/role/${roleId}`);
  }

  create(dto: CreatePermissionDto): Observable<PermissionDto> {
    return this.http.post<PermissionDto>(this.base, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  assignToRole(roleId: number, dto: AssignPermissionDto): Observable<void> {
    return this.http.post<void>(`${this.base}/role/${roleId}`, dto);
  }

  removeFromRole(roleId: number, permissionId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/role/${roleId}/${permissionId}`);
  }
}
