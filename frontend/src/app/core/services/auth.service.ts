/**
 * @description Authentication service handling login, registration, and token management
 * @author Anjana E
 * @date 24-03-2026
 */
import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'tm-token';
  private http = inject(HttpClient);
  private router = inject(Router);

  private _currentUser = signal<User | null>(null);
  private _isLoading = signal<boolean>(false);

  /** Public readonly signals */
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  /**
   * @description Get stored JWT token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * @description Login with email and password
   */
  login(payload: LoginPayload): Observable<TokenResponse> {
    this._isLoading.set(true);
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((res) => {
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        this._isLoading.set(false);
      }),
      catchError((err) => {
        this._isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * @description Register a new user
   */
  register(payload: RegisterPayload): Observable<User> {
    this._isLoading.set(true);
    return this.http.post<User>(`${environment.apiUrl}/auth/register`, payload).pipe(
      tap(() => this._isLoading.set(false)),
      catchError((err) => {
        this._isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * @description Load current user profile from token
   */
  loadCurrentUser(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap((user) => this._currentUser.set(user)),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  /**
   * @description Fetch all users for assignee selection
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/auth/users`);
  }

  /**
   * @description Clear session and navigate to login
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
