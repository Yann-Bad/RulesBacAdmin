import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { Observable } from 'rxjs';
import type { RoleDto, CreateRoleDto } from '../models/models';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/roles`;

  list(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(this.base);
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
