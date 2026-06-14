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
import { CatalogItem, CreateCatalogRequest } from '../../../core/models/catalog.models';
import { Page } from '../../../core/models/user.models';
import { GridAction, GridColumn, GridFilterField, GridState } from '../../../shared/grid/grid.models';
import { GridComponent } from '../../../shared/grid/grid.component';

@Component({
  selector: 'app-supervisor-stop-types',
  imports: [ReactiveFormsModule, GridComponent],
  templateUrl: './stop-types.component.html',
})
export class StopTypesComponent implements OnInit, AfterViewInit {
  private readonly fb         = inject(FormBuilder);
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl     = environment.apiUrl;
  private readonly endpoint   = `${this.apiUrl}/api/supervisor/stop-types`;

  @ViewChild('createModal') private modalRef!: ElementRef<HTMLElement>;
  private bsModal: { show(): void; hide(): void } | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });

  private readonly _pageData = signal<Page<CatalogItem> | null>(null);
  readonly items         = computed(() => this._pageData()?.content ?? []);
  readonly totalElements = computed(() => this._pageData()?.totalElements ?? 0);
  readonly totalPages    = computed(() => this._pageData()?.totalPages ?? 0);

  readonly loading             = signal(false);
  readonly submitting          = signal(false);
  readonly deletingId          = signal<string | null>(null);
  readonly errorMessage        = signal('');
  readonly tableSuccessMessage = signal('');

  private _currentGridState: GridState = { filters: {}, sort: null, page: 0, size: 10 };

  readonly gridColumns: GridColumn[] = [
    { key: 'name',      label: 'Name',    sortable: true, type: 'text' },
    { key: 'createdAt', label: 'Created', sortable: true, type: 'date' },
  ];

  readonly gridFilters: GridFilterField[] = [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'Search name…' },
  ];

  readonly gridActions: GridAction[] = [
    { key: 'delete', label: 'Delete', btnClass: 'btn-outline-danger', icon: 'delete' },
  ];

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.modalRef?.nativeElement) return;
    this.modalRef.nativeElement.addEventListener('hidden.bs.modal', () => {
      this.form.reset({ name: '' });
      this.errorMessage.set('');
    });
  }

  onGridStateChange(state: GridState): void {
    this._currentGridState = state;
    this.loadItems(state);
  }

  onGridAction(event: { action: GridAction; row: unknown }): void {
    if (event.action.key === 'delete') {
      const item = event.row as CatalogItem;
      this.deletingId.set(item.id);
      this.http.delete(`${this.endpoint}/${item.id}`).subscribe({
        next: () => {
          this.deletingId.set(null);
          this.tableSuccessMessage.set(`Stop type "${item.name}" deleted.`);
          setTimeout(() => this.tableSuccessMessage.set(''), 4000);
          this.loadItems(this._currentGridState);
        },
        error: (err) => {
          this.deletingId.set(null);
          this.tableSuccessMessage.set('');
          this.errorMessage.set(err.error?.message ?? 'Failed to delete stop type. Please try again.');
        },
      });
    }
  }

  loadItems(state: GridState): void {
    this.loading.set(true);
    this.http.get<Page<CatalogItem>>(this.endpoint, { params: this.buildParams(state) }).subscribe({
      next: (page) => { this._pageData.set(page); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openModal(): void { this.modal?.show(); }
  closeModal(): void { this.modal?.hide(); }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMessage.set('');
    const body: CreateCatalogRequest = this.form.getRawValue();
    this.http.post<CatalogItem>(this.endpoint, body).subscribe({
      next: (item) => {
        this.submitting.set(false);
        this.closeModal();
        this.tableSuccessMessage.set(`Stop type "${item.name}" created.`);
        setTimeout(() => this.tableSuccessMessage.set(''), 5000);
        this.loadItems(this._currentGridState);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err.status === 409
            ? 'A stop type with that name already exists.'
            : (err.error?.message ?? 'Failed to create stop type. Please try again.')
        );
      },
    });
  }

  dismissSuccess(): void { this.tableSuccessMessage.set(''); }
  get nameControl() { return this.form.controls.name; }

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
    let p = new HttpParams().set('page', state.page.toString()).set('size', state.size.toString());
    if (state.sort) p = p.set('sort', `${state.sort.field},${state.sort.direction}`);
    for (const [k, v] of Object.entries(state.filters)) { if (v) p = p.set(k, v); }
    return p;
  }
}
