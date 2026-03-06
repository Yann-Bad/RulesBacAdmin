import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { Observable } from 'rxjs';
import type {
  CentreDto, CentreTreeDto,
  CreateCentreDto, UpdateCentreDto,
  AssignUserCentreDto, CentreUserDto,
  UserCentreAssignmentDto,
  PagedResult
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class CentresService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/centres`;

  list(): Observable<CentreDto[]> {
    return this.http.get<CentreDto[]>(this.base);
  }

  tree(): Observable<CentreTreeDto> {
    return this.http.get<CentreTreeDto>(`${this.base}/tree`);
  }

  get(id: number): Observable<CentreDto> {
    return this.http.get<CentreDto>(`${this.base}/${id}`);
  }

  create(dto: CreateCentreDto): Observable<CentreDto> {
    return this.http.post<CentreDto>(this.base, dto);
  }

  update(id: number, dto: UpdateCentreDto): Observable<CentreDto> {
    return this.http.put<CentreDto>(`${this.base}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getForUser(userId: number): Observable<UserCentreAssignmentDto[]> {
    return this.http.get<UserCentreAssignmentDto[]>(`${this.base}/user/${userId}`);
  }

  getUsersForCentre(centreId: number, page = 1, pageSize = 15, search = ''): Observable<PagedResult<CentreUserDto>> {
    const params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('search', search);
    return this.http.get<PagedResult<CentreUserDto>>(`${this.base}/${centreId}/users`, { params });
  }

  assign(dto: AssignUserCentreDto): Observable<void> {
    return this.http.post<void>(`${this.base}/assign`, dto);
  }

  unassign(userId: number, centreId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/assign/${userId}/${centreId}`);
  }
}
