import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import type { Observable } from 'rxjs';
import type { ClientDto, CreateClientDto, UpdateClientDto } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/clients`;

  list(): Observable<ClientDto[]> {
    return this.http.get<ClientDto[]>(this.base);
  }

  get(clientId: string): Observable<ClientDto> {
    return this.http.get<ClientDto>(`${this.base}/${encodeURIComponent(clientId)}`);
  }

  create(dto: CreateClientDto): Observable<ClientDto> {
    return this.http.post<ClientDto>(this.base, dto);
  }

  update(clientId: string, dto: UpdateClientDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${encodeURIComponent(clientId)}`, dto);
  }

  delete(clientId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(clientId)}`);
  }
}
