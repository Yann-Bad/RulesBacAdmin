import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { Observable } from 'rxjs';
import type { RoleDto, CreateRoleDto, UpdateRoleDto, PagedResult } from '../models/models';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/roles`;

  list(page = 1, pageSize = 10, search = '', sortBy = 'name', sortDir = 'asc'): Observable<PagedResult<RoleDto>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('search', search)
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);
    return this.http.get<PagedResult<RoleDto>>(this.base, { params });
  }

  get(name: string): Observable<RoleDto> {
    return this.http.get<RoleDto>(`${this.base}/${name}`);
  }

  create(dto: CreateRoleDto): Observable<RoleDto> {
    return this.http.post<RoleDto>(this.base, dto);
  }

  update(name: string, dto: UpdateRoleDto): Observable<RoleDto> {
    return this.http.put<RoleDto>(`${this.base}/${name}`, dto);
  }

  delete(name: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${name}`);
  }
}
