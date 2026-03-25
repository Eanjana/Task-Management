/**
 * @description Login page component with registration toggle
 * @author Developer
 * @date 24-03-2026
 */
import { Component, ChangeDetectionStrategy, signal, inject, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ThemeService } from '../../../core/services/theme.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  protected themeService = inject(ThemeService);

  /** Form state signals */
  protected isRegisterMode = signal(false);
  protected email = signal('');
  protected password = signal('');
  protected username = signal('');
  protected errorMessage = signal('');
  protected isLoading = this.authService.isLoading;

  /**
   * @description Toggle between login and register modes
   */
  toggleMode(): void {
    this.isRegisterMode.update((v) => !v);
    this.errorMessage.set('');
  }

  /**
   * @description Handle form submission for login or registration
   */
  onSubmit(): void {
    this.errorMessage.set('');

    if (this.isRegisterMode()) {
      this.authService
        .register({
          username: this.username(),
          email: this.email(),
          password: this.password(),
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toast.success('Account created! Please login.');
            this.isRegisterMode.set(false);
          },
          error: (err) => {
            this.errorMessage.set(
              err.error?.detail ?? 'Registration failed'
            );
          },
        });
    } else {
      this.authService
        .login({ email: this.email(), password: this.password() })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.authService
              .loadCurrentUser()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: () => this.router.navigate(['/']),
                error: () => this.router.navigate(['/']),
              });
          },
          error: (err) => {
            this.errorMessage.set(
              err.error?.detail ?? 'Invalid email or password'
            );
          },
        });
    }
  }
}
