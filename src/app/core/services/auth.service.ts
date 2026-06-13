import { inject, Injectable, PLATFORM_ID, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthState,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  ResetPasswordRequest,
} from '../models/auth.models';

const STORAGE_KEY = 'pv_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = environment.apiUrl;

  private readonly _authState = signal<AuthState | null>(this.loadFromStorage());

  readonly authState = this._authState.asReadonly();
  readonly isAuthenticated = computed(() => this._authState() !== null);
  readonly currentRole = computed(() => this._authState()?.role ?? null);
  readonly currentEmail = computed(() => this._authState()?.email ?? null);

  login(email: string, password: string): Observable<LoginResponse> {
    const body: LoginRequest = { email, password };
    return this.http.post<LoginResponse>(`${this.apiUrl}/api/auth/login`, body).pipe(
      tap((res) => this.persist({ accessToken: res.accessToken, refreshToken: res.refreshToken, role: res.role, email }))
    );
  }

  logout(): void {
    this.clear();
    this.router.navigate(['/login']);
  }

  forgotPassword(email: string): Observable<void> {
    const body: ForgotPasswordRequest = { email };
    return this.http.post<void>(`${this.apiUrl}/api/auth/forgot-password`, body);
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    const body: ResetPasswordRequest = { token, newPassword };
    return this.http.post<void>(`${this.apiUrl}/api/auth/reset-password`, body);
  }

  refreshToken(): Observable<LoginResponse> {
    const state = this._authState();
    if (!state) throw new Error('No refresh token available');
    const body: RefreshTokenRequest = { refreshToken: state.refreshToken };
    return this.http.post<LoginResponse>(`${this.apiUrl}/api/auth/refresh`, body).pipe(
      tap((res) =>
        this.persist({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          role: res.role,
          email: state.email,
        })
      )
    );
  }

  getAccessToken(): string | null {
    return this._authState()?.accessToken ?? null;
  }

  private persist(state: AuthState): void {
    this._authState.set(state);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }

  private clear(): void {
    this._authState.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private loadFromStorage(): AuthState | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthState) : null;
    } catch {
      return null;
    }
  }
}
