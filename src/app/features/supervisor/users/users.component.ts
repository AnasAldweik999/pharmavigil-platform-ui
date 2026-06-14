import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { Page, UserResponse } from '../../../core/models/user.models';
import { GridAction, GridColumn, GridFilterField, GridState } from '../../../shared/grid/grid.models';
import { GridComponent } from '../../../shared/grid/grid.component';

@Component({
  selector: 'app-supervisor-users',
  imports: [ReactiveFormsModule, GridComponent],
  templateUrl: './users.component.html',
})
export class SupervisorUsersComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = environment.apiUrl;

  @ViewChild('createUserModal') private modalRef!: ElementRef<HTMLElement>;
  private bsModal: { show(): void; hide(): void } | null = null;

  readonly form = this.fb.nonNullable.group({
    role: ['STAFF' as 'SUPERVISOR' | 'STAFF', Validators.required],
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
  });

  private readonly _pageData = signal<Page<UserResponse> | null>(null);
  readonly users         = computed(() => this._pageData()?.content ?? []);
  readonly totalElements = computed(() => this._pageData()?.totalElements ?? 0);
  readonly totalPages    = computed(() => this._pageData()?.totalPages ?? 0);

  readonly loading             = signal(false);
  readonly submitting          = signal(false);
  readonly togglingId          = signal<string | null>(null);
  readonly errorMessage        = signal('');
  readonly tableSuccessMessage = signal('');

  private _currentGridState: GridState = { filters: {}, sort: null, page: 0, size: 10 };

  readonly gridColumns: GridColumn[] = [
    { key: 'name',      label: 'Name',    sortable: true, type: 'text' },
    { key: 'email',     label: 'Email',   sortable: true, type: 'text' },
    { key: 'role',      label: 'Role',    sortable: true, type: 'badge',
      badgeClass: (v) => v === 'SUPERVISOR' ? 'bg-primary' : 'bg-secondary' },
    { key: 'status',    label: 'Status',  sortable: true, type: 'badge',
      badgeClass: (v) => v === 'ACTIVE' ? 'bg-success' : v === 'INACTIVE' ? 'bg-danger' : 'bg-warning text-dark' },
    { key: 'createdAt', label: 'Created', sortable: true, type: 'date' },
    { key: 'updatedAt', label: 'Updated', sortable: true, type: 'date' },
  ];

  readonly gridFilters: GridFilterField[] = [
    { key: 'name',   label: 'Name',   type: 'text',   placeholder: 'Search name…' },
    { key: 'email',  label: 'Email',  type: 'text',   placeholder: 'Search email…' },
    { key: 'role',   label: 'Role',   type: 'select', options: [
        { label: 'All roles',   value: '' },
        { label: 'Supervisor',  value: 'SUPERVISOR' },
        { label: 'Staff',       value: 'STAFF' },
    ]},
    { key: 'status', label: 'Status', type: 'select', options: [
        { label: 'All statuses',         value: '' },
        { label: 'Active',               value: 'ACTIVE' },
        { label: 'Inactive',             value: 'INACTIVE' },
        { label: 'Pending verification', value: 'PENDING_EMAIL_VERIFICATION' },
    ]},
  ];

  readonly gridActions: GridAction[] = [
    {
      key: 'deactivate',
      label: 'Deactivate',
      btnClass: 'btn-outline-danger',
      icon: 'deactivate',
      condition: (row) => {
        const u = row as UserResponse;
        return u.role === 'STAFF' && u.status === 'ACTIVE';
      },
    },
    {
      key: 'activate',
      label: 'Activate',
      btnClass: 'btn-outline-success',
      icon: 'activate',
      condition: (row) => {
        const u = row as UserResponse;
        return u.role === 'STAFF' && u.status === 'INACTIVE';
      },
    },
  ];

  ngOnInit(): void {
    // Initial load is triggered by GridComponent emitting stateChange on init
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.modalRef?.nativeElement) return;
    this.modalRef.nativeElement.addEventListener('hidden.bs.modal', () => {
      this.form.reset({ role: 'STAFF', name: '', email: '' });
      this.errorMessage.set('');
    });
  }

  onGridStateChange(state: GridState): void {
    this._currentGridState = state;
    this.loadUsers(state);
  }

  onGridAction(event: { action: GridAction; row: unknown }): void {
    if (event.action.key === 'deactivate' || event.action.key === 'activate') {
      const user = event.row as UserResponse;
      this.togglingId.set(user.id);
      this.http.patch<UserResponse>(`${this.apiUrl}/api/supervisor/users/${user.id}/active`, {}).subscribe({
        next: () => {
          this.togglingId.set(null);
          this.loadUsers(this._currentGridState);
        },
        error: () => this.togglingId.set(null),
      });
    }
  }

  loadUsers(state: GridState): void {
    this.loading.set(true);
    const params = this.buildParams(state);
    this.http.get<Page<UserResponse>>(`${this.apiUrl}/api/supervisor/users`, { params }).subscribe({
      next: (page) => {
        this._pageData.set(page);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openModal(): void {
    this.modal?.show();
  }

  closeModal(): void {
    this.modal?.hide();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { role, name, email } = this.form.getRawValue();
    const endpoint = role === 'SUPERVISOR' ? 'supervisors' : 'staff';

    this.submitting.set(true);
    this.errorMessage.set('');

    this.http.post<UserResponse>(`${this.apiUrl}/api/supervisor/users/${endpoint}`, { name, email }).subscribe({
      next: (newUser) => {
        this.submitting.set(false);
        this.closeModal();
        const label = role === 'SUPERVISOR' ? 'Supervisor' : 'Staff';
        this.tableSuccessMessage.set(
          `${label} account created — a password setup email has been sent to ${newUser.email}.`
        );
        setTimeout(() => this.tableSuccessMessage.set(''), 6000);
        this.loadUsers(this._currentGridState);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.status === 409
            ? 'A user with that email already exists.'
            : 'Failed to create user. Please try again.'
        );
      },
    });
  }

  dismissSuccess(): void {
    this.tableSuccessMessage.set('');
  }

  get nameControl()  { return this.form.controls.name; }
  get emailControl() { return this.form.controls.email; }

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

  private buildParams(state: GridState): HttpParams {
    let p = new HttpParams()
      .set('page', state.page.toString())
      .set('size', state.size.toString());
    if (state.sort) p = p.set('sort', `${state.sort.field},${state.sort.direction}`);
    for (const [k, v] of Object.entries(state.filters)) {
      if (v) p = p.set(k, v);
    }
    return p;
  }
}
