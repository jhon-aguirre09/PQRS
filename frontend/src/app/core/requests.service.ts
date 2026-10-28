import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PqrsItem, PqrsList, PqrsPayload, RequestStatus } from './models';

export interface RequestFilters {
  status?: string;
  type?: string;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class RequestsService {
  private readonly baseUrl = 'http://localhost:3000/api/pqrs';

  constructor(private readonly http: HttpClient) {}

  list(filters: RequestFilters = {}): Observable<PqrsList> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    return this.http.get<PqrsList>(this.baseUrl, { params });
  }

  get(id: number): Observable<{ item: PqrsItem }> {
    return this.http.get<{ item: PqrsItem }>(`${this.baseUrl}/${id}`);
  }

  create(payload: PqrsPayload): Observable<{ item: PqrsItem; message: string }> {
    return this.http.post<{ item: PqrsItem; message: string }>(this.baseUrl, payload);
  }

  update(id: number, payload: PqrsPayload): Observable<{ item: PqrsItem; message: string }> {
    return this.http.put<{ item: PqrsItem; message: string }>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  generateDraft(id: number): Observable<{ draft: string; provider: string }> {
    return this.http.post<{ draft: string; provider: string }>(`${this.baseUrl}/${id}/draft`, {});
  }

  sendResponse(id: number, responseText: string): Observable<{ item: PqrsItem; message: string }> {
    return this.http.post<{ item: PqrsItem; message: string }>(
      `${this.baseUrl}/${id}/response`,
      { responseText }
    );
  }

  changeStatus(id: number, status: RequestStatus): Observable<{ item: PqrsItem }> {
    return this.http.patch<{ item: PqrsItem }>(`${this.baseUrl}/${id}/status`, { status });
  }
}
