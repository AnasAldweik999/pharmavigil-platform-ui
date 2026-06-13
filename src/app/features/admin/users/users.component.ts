import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { UserResponse } from '../../../core/models/user.models';

@Component({
  selector: 'app-admin-users',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './users.component.html',
})
export class AdminUsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  readonly form = this.fb.nonNullable.group({
    role: ['EMPLOYEE' as 'ADMIN' | 'EMPLOYEE', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  readonly users = signal<UserResponse[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.http.get<UserResponse[]>(`${this.apiUrl}/api/admin/users`).subscribe({
      next: (data) => {
        this.users.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { role, email } = this.form.getRawValue();
    const endpoint = role === 'ADMIN' ? 'admins' : 'employees';

    this.submitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.http.post<UserResponse>(`${this.apiUrl}/api/admin/users/${endpoint}`, { email }).subscribe({
      next: (newUser) => {
        this.submitting.set(false);
        this.successMessage.set(`${role === 'ADMIN' ? 'Admin' : 'Employee'} account created. A password reset email has been sent to ${newUser.email}.`);
        this.form.reset({ role: 'EMPLOYEE', email: '' });
        this.loadUsers();
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.status === 409 ? 'A user with that email already exists.' : 'Failed to create user. Please try again.'
        );
      },
    });
  }

  get emailControl() {
    return this.form.controls.email;
  }
}
