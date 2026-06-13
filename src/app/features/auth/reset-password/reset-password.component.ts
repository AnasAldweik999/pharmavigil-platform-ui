import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(null);
  readonly loading = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly resetForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  ngOnInit(): void {
    const tokenParam = this.route.snapshot.queryParamMap.get('token');
    this.token.set(tokenParam);
  }

  onForgotSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.forgotPassword(this.forgotForm.getRawValue().email).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set('If that email is registered, a reset link has been sent.');
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Something went wrong. Please try again.');
      },
    });
  }

  onResetSubmit(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.resetForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.resetPassword(this.token()!, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set('Password reset successfully. Redirecting to login…');
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Reset link is invalid or expired. Please request a new one.');
      },
    });
  }

  get emailControl() {
    return this.forgotForm.controls.email;
  }

  get newPasswordControl() {
    return this.resetForm.controls.newPassword;
  }

  get confirmPasswordControl() {
    return this.resetForm.controls.confirmPassword;
  }
}
