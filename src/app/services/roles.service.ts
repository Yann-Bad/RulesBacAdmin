import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { Observable } from 'rxjs';
import type { RoleDto, CreateRoleDto, PagedResult } from '../models/models';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/roles`;

  list(page = 1, pageSize = 10, search = ''): Observable<PagedResult<RoleDto>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('search', search);
    return this.http.get<PagedResult<RoleDto>>(this.base, { params });
  }

  get(name: string): Observable<RoleDto> {
    return this.http.get<RoleDto>(`${this.base}/${name}`);
  }

  create(dto: CreateRoleDto): Observable<RoleDto> {
    return this.http.post<RoleDto>(this.base, dto);
  }

  delete(name: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${name}`);
  }
}
