import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { Observable } from 'rxjs';
import type { AuditLogDto, PagedResult } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/audit`;

  list(
    page     = 1,
    pageSize = 25,
    search   = '',
    actor    = '',
    entity   = '',
    action   = ''
  ): Observable<PagedResult<AuditLogDto>> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    if (actor)  params = params.set('actor', actor);
    if (entity) params = params.set('entity', entity);
    if (action) params = params.set('action', action);
    return this.http.get<PagedResult<AuditLogDto>>(this.base, { params });
  }
}
