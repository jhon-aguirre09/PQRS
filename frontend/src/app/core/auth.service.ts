import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from './models';

interface LoginResponse {
  token: string;
  user: User;
}

interface RegisterPayload {
  fullName: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = 'http://localhost:3000/api/auth';
  private readonly storedUser = this.readStoredUser();
  private readonly currentUserSignal = signal<User | null>(this.storedUser);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap((response) => {
        localStorage.setItem('pqrs_token', response.token);
        localStorage.setItem('pqrs_user', JSON.stringify(response.user));
        this.currentUserSignal.set(response.user);
      })
    );
  }

  register(payload: RegisterPayload): Observable<{ user: User; message: string }> {
    return this.http.post<{ user: User; message: string }>(`${this.baseUrl}/register`, payload);
  }

  logout(): void {
    localStorage.removeItem('pqrs_token');
    localStorage.removeItem('pqrs_user');
    this.currentUserSignal.set(null);
  }

  private readStoredUser(): User | null {
    try {
      const value = localStorage.getItem('pqrs_user');
      return value ? JSON.parse(value) as User : null;
    } catch {
      localStorage.removeItem('pqrs_user');
      localStorage.removeItem('pqrs_token');
      return null;
    }
  }
}
