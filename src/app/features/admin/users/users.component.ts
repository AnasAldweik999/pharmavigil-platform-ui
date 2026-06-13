import { AfterViewInit, Component, ElementRef, inject, OnInit, PLATFORM_ID, signal, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { UserResponse } from '../../../core/models/user.models';

@Component({
  selector: 'app-admin-users',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './users.component.html',
})
export class AdminUsersComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = environment.apiUrl;

  @ViewChild('createUserModal') private modalRef!: ElementRef<HTMLElement>;
  private bsModal: { show(): void; hide(): void } | null = null;

  readonly form = this.fb.nonNullable.group({
    role: ['EMPLOYEE' as 'ADMIN' | 'EMPLOYEE', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  readonly users = signal<UserResponse[]>([]);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly tableSuccessMessage = signal('');

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.modalRef?.nativeElement) return;
    // Reset form whenever the modal is dismissed by any means (X, backdrop, Escape)
    this.modalRef.nativeElement.addEventListener('hidden.bs.modal', () => {
      this.form.reset({ role: 'EMPLOYEE', email: '' });
      this.errorMessage.set('');
    });
  }

  openModal(): void {
    this.modal?.show();
  }

  closeModal(): void {
    this.modal?.hide();
  }

  private get modal(): { show(): void; hide(): void } | null {
    if (!isPlatformBrowser(this.platformId) || !this.modalRef?.nativeElement) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BootstrapModal = (window as any).bootstrap?.Modal;
    if (!BootstrapModal) return null;
    if (!this.bsModal) {
      this.bsModal = new BootstrapModal(this.modalRef.nativeElement) as { show(): void; hide(): void };
    }
    return this.bsModal;
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
    this.errorMessage.set('');

    this.http.post<UserResponse>(`${this.apiUrl}/api/admin/users/${endpoint}`, { email }).subscribe({
      next: (newUser) => {
        this.submitting.set(false);
        this.closeModal();
        const label = role === 'ADMIN' ? 'Admin' : 'Employee';
        this.tableSuccessMessage.set(`${label} account created — a password setup email has been sent to ${newUser.email}.`);
        setTimeout(() => this.tableSuccessMessage.set(''), 6000);
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

  dismissSuccess(): void {
    this.tableSuccessMessage.set('');
  }

  get emailControl() {
    return this.form.controls.email;
  }
}
