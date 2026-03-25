/**
 * @description Login page component with registration toggle
 * @author Developer
 * @date 24-03-2026
 */
import { Component, ChangeDetectionStrategy, signal, inject, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ThemeService } from '../../../core/services/theme.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  protected themeService = inject(ThemeService);

  /** Form state signals */
  protected isRegisterMode = signal(false);
  protected errorMessage = signal('');
  protected isLoading = this.authService.isLoading;

  /** Password regex: at least 6 chars, 1 uppercase, 1 number, 1 symbol */
  private passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;
  /** Email regex: @ and . with at least 2 characters after . */
  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  /** Reactive Form Group */
  protected authForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.pattern(this.emailRegex)]],
    password: ['', [Validators.required, Validators.pattern(this.passwordRegex)]],
    username: ['', []] // Optional by default, will add required if register mode
  });

  constructor() {
    /** Initialize username validator based on mode */
    this.authForm.statusChanges.pipe(takeUntilDestroyed()).subscribe();
    
    /** Redirect if already authenticated */
    this.authService.checkAuth().pipe(takeUntilDestroyed()).subscribe(isAuth => {
      if (isAuth) {
        this.router.navigate(['/']);
      }
    });
  }

  /**
   * @description Toggle between login and register modes
   */
  toggleMode(): void {
    const isRegister = !this.isRegisterMode();
    this.isRegisterMode.set(isRegister);
    this.errorMessage.set('');

    const usernameControl = this.authForm.get('username');
    if (isRegister) {
      usernameControl?.setValidators([Validators.required, Validators.minLength(3)]);
    } else {
      usernameControl?.clearValidators();
    }
    usernameControl?.updateValueAndValidity();
  }

  /**
   * @description Handle form submission for login or registration
   */
  onSubmit(): void {
    this.errorMessage.set('');

    if (this.authForm.invalid) {
      this.authForm.markAllAsTouched();
      
      // Professional messages for specific validation failures
      const controls = this.authForm.controls;
      
      if (controls['email'].errors?.['required'] || controls['password'].errors?.['required'] || 
         (this.isRegisterMode() && controls['username'].errors?.['required'])) {
        this.errorMessage.set('All fields are required. Please complete the form.');
        return;
      }

      if (controls['email'].errors?.['pattern']) {
        this.errorMessage.set('Please enter a professional email format (e.g., mail@example.com)');
        return;
      }

      if (controls['password'].errors?.['pattern']) {
        this.errorMessage.set('Password must be 6+ characters with at least one capital letter, one number, and one symbol.');
        return;
      }
      
      return;
    }

    const { email, password, username } = this.authForm.value;
    const normalizedEmail = email.toLowerCase();

    if (this.isRegisterMode()) {
      this.authService
        .register({
          username,
          email: normalizedEmail,
          password,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toast.success('Your account has been created successfully!');
            this.isRegisterMode.set(false);
            this.authForm.reset();
            this.errorMessage.set('');
          },
          error: (err) => {
            this.errorMessage.set(this.extractErrorMessage(err));
          },
        });
    } else {
      this.authService
        .login({ email: normalizedEmail, password })
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
            this.errorMessage.set(this.extractErrorMessage(err, 'Invalid email or password. Please try again.'));
          },
        });
    }
  }

  /**
   * @description Extract string error message from HTTP response
   */
  private extractErrorMessage(err: any, defaultMsg: string = 'Requested action failed'): string {
    const detail = err.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) return detail[0].msg || detail[0].message || defaultMsg;
    return defaultMsg;
  }
}
