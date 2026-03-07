import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, shareReplay, throwError, tap } from 'rxjs';
import type { Observable } from 'rxjs';
import { AuthUser, TokenPayload, TokenResponse } from '../models/models';

const ACCESS_TOKEN_KEY  = 'rubac_admin_access_token';
const REFRESH_TOKEN_KEY = 'rubac_admin_refresh_token';
const ID_TOKEN_KEY      = 'rubac_admin_id_token';

// Token endpoint is proxied via proxy.conf.json: /connect → http://localhost:5262/connect
const TOKEN_URL = '/connect/token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser     = signal<AuthUser | null>(this.loadUserFromStorage());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isSuperAdmin    = computed(() => this.currentUser()?.isSuperAdmin ?? false);

  login(userName: string, password: string): Observable<void> {
    const body = new HttpParams()
      .set('grant_type',  'password')
      .set('client_id',   'RubacCore')
      .set('username',    userName)
      .set('password',    password)
      .set('scope',       'openid profile email roles rubac offline_access');

    return this.http
      .post<TokenResponse>(TOKEN_URL, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(map(r => { this.storeTokens(r); }));
  }

  // Shared in-flight refresh — multiple concurrent 401s share one token request
  private refreshInFlight$: Observable<void> | null = null;

  refresh(): Observable<void> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      // No refresh token yet (e.g. freshly issued access token with no offline_access)
      // Do NOT logout here — let the interceptor decide what to do.
      return throwError(() => new Error('no_refresh_token'));
    }

    const body = new HttpParams()
      .set('grant_type',    'refresh_token')
      .set('client_id',     'RubacCore')
      .set('refresh_token', refreshToken);

    this.refreshInFlight$ = this.http
      .post<TokenResponse>(TOKEN_URL, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(
        map(r => { this.storeTokens(r); }),
        tap({ complete: () => { this.refreshInFlight$ = null; },
              error:    () => { this.refreshInFlight$ = null; } }),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }

  logout(): void {
    if (!this.currentUser()) return; // idempotent — avoid double navigation
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ID_TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /** True only when the id_token is present and past its exp claim. */
  isSessionExpired(): boolean {
    const idToken = localStorage.getItem(ID_TOKEN_KEY);
    if (idToken) return this.isTokenExpired(idToken);
    // No id_token — can't determine expiry, assume still valid to avoid spurious logouts
    return false;
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private storeTokens(response: TokenResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
    // Always overwrite or clear the refresh token slot — prevents a stale token
    // from a previous session surviving when the new grant does not issue one.
    if (response.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    if (response.id_token) {
      localStorage.setItem(ID_TOKEN_KEY, response.id_token);
    } else {
      // No new id_token — remove the old one so loadUserFromStorage won't
      // decode a stale id_token from a previous session on next refresh.
      localStorage.removeItem(ID_TOKEN_KEY);
    }

    // Decode user info from id_token when available (plain JWS guaranteed),
    // falling back to access_token. If the id_token decoded correctly but has
    // no roles (e.g. scope not granted), also try the access_token for roles.
    const tokenToDecode = response.id_token ?? response.access_token;
    const user = this.mergeRoles(this.decodeToken(tokenToDecode), response.access_token);
    this.currentUser.set(user);
  }

  private decodeToken(jwt: string): AuthUser | null {
    try {
      const payload = JSON.parse(
        atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      ) as TokenPayload;

      const roles = Array.isArray(payload.role)
        ? payload.role
        : payload.role ? [payload.role] : [];

      return {
        id:           payload.sub,
        userName:     payload.name ?? payload.sub ?? '',
        email:        payload.email,
        roles,
        isSuperAdmin: roles.includes('SuperAdmin'),
      };
    } catch {
      return null;
    }
  }

  private loadUserFromStorage(): AuthUser | null {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken) return null;

    // Reject tokens that lack the rubac_api audience — they were issued before
    // the rubac scope was added and the backend will return 401 for every call.
    if (!this.hasRequiredAudience(accessToken)) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(ID_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return null;
    }

    const idToken = localStorage.getItem(ID_TOKEN_KEY);
    const user    = this.mergeRoles(this.decodeToken(idToken ?? accessToken), accessToken);

    // Use id_token for expiry check (it's a plain JWS, unlike the encrypted access token)
    if (user && idToken && this.isTokenExpired(idToken)) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(ID_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY); // clear stale refresh token too
      return null;
    }
    // Fallback: if only access_token is present (no id_token), check its expiry too
    if (user && !idToken && this.isTokenExpired(accessToken)) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY); // clear stale refresh token too
      return null;
    }
    return user;
  }

  /**
   * If a user was decoded from the id_token but has no roles (the id_token
   * was issued without the roles scope), try to extract roles from the
   * access_token which always carries role claims.
   */
  private mergeRoles(user: AuthUser | null, accessToken: string): AuthUser | null {
    if (!user || user.roles.length > 0) return user;
    const fromAccess = this.decodeToken(accessToken);
    if (!fromAccess || fromAccess.roles.length === 0) return user;
    return { ...user, roles: fromAccess.roles, isSuperAdmin: fromAccess.isSuperAdmin };
  }

  private hasRequiredAudience(accessToken: string): boolean {
    try {
      const payload = JSON.parse(
        atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      ) as { aud?: string | string[] };
      const aud = payload.aud;
      if (!aud) return false;
      return Array.isArray(aud) ? aud.includes('rubac_api') : aud === 'rubac_api';
    } catch {
      return false;
    }
  }

  private isTokenExpired(jwt: string): boolean {
    try {
      // JWT parts are base64url-encoded; atob() requires standard base64
      const payload = JSON.parse(
        atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      ) as TokenPayload;
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
