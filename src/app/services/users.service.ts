import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { Observable } from 'rxjs';
import type { UserDto, RegisterDto, UpdateUserDto, AssignRoleDto } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/users`;

  list(): Observable<UserDto[]> {  
    return this.http.get<UserDto[]>(this.base);
  }

  get(id: number): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.base}/${id}`);
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

  assignRole(dto: AssignRoleDto): Observable<void> {
    return this.http.post<void>(`${this.base}/assign-role`, dto);
  }

  removeRole(userId: number, roleName: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${userId}/roles/${roleName}`);
  }
}
