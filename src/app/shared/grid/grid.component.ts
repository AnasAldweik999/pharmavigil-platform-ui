import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { DatePipe, isPlatformBrowser, NgClass } from '@angular/common';
import { GridAction, GridColumn, GridFilterField, GridSortState, GridState } from './grid.models';

@Component({
  selector: 'app-grid',
  imports: [DatePipe, NgClass],
  templateUrl: './grid.component.html',
})
export class GridComponent implements OnInit, AfterViewInit {
  @Input({ required: true }) columns: GridColumn[] = [];
  @Input() filterFields: GridFilterField[] = [];
  @Input() initialFilters: Record<string, string> = {};
  @Input({ required: true }) rows: unknown[] = [];
  @Input() totalElements = 0;
  @Input() totalPages = 0;
  @Input() pageSize = 10;
  @Input() loading = false;
  @Input() pageSizes: number[] = [10, 25, 50];
  @Input() actions: GridAction[] = [];
  @Input() actionsDisabled = false;

  @Output() stateChange   = new EventEmitter<GridState>();
  @Output() actionClick   = new EventEmitter<{ action: GridAction; row: unknown }>();

  @ViewChild('filterPanel') private filterPanelRef!: ElementRef<HTMLElement>;
  private readonly platformId = inject(PLATFORM_ID);
  private bsOffcanvas: { show(): void; hide(): void } | null = null;

  private readonly _sort           = signal<GridSortState | null>(null);
  private readonly _page           = signal(0);
  private readonly _size           = signal(10);
  private readonly _draftFilters   = signal<Record<string, string>>({});
  private readonly _appliedFilters = signal<Record<string, string>>({});

  readonly sortField    = computed(() => this._sort()?.field ?? null);
  readonly sortDirection = computed(() => this._sort()?.direction ?? null);
  readonly currentPage  = computed(() => this._page());
  readonly currentSize  = computed(() => this._size());
  readonly draftFilters = this._draftFilters.asReadonly();

  readonly appliedFilterEntries = computed(() => {
    const result: { key: string; label: string; displayValue: string }[] = [];
    for (const [key, value] of Object.entries(this._appliedFilters())) {
      if (!value) continue;
      const field = this.filterFields.find(f => f.key === key);
      if (!field) continue;
      const displayValue =
        field.type === 'select'
          ? (field.options?.find(o => o.value === value)?.label ?? value)
          : value;
      result.push({ key, label: field.label, displayValue });
    }
    return result;
  });

  readonly pageNumbers = computed(() => {
    const total = this.totalPages;
    const current = this._page();
    if (total <= 1) return [];
    const range: number[] = [];
    const delta = 2;
    const start = Math.max(0, current - delta);
    const end = Math.min(total - 1, current + delta);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  });

  readonly showingFrom = computed(() => {
    if (this.totalElements === 0) return 0;
    return this._page() * this._size() + 1;
  });

  readonly showingTo = computed(() =>
    Math.min(this._page() * this._size() + this._size(), this.totalElements)
  );

  ngOnInit(): void {
    this._size.set(this.pageSize);
    if (Object.keys(this.initialFilters).length) {
      this._appliedFilters.set({ ...this.initialFilters });
      this._draftFilters.set({ ...this.initialFilters });
    }
    this.emitState();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.filterPanelRef?.nativeElement) return;
    this.filterPanelRef.nativeElement.addEventListener('hidden.bs.offcanvas', () => {
      // Panel closed by Escape or backdrop — no state change needed
    });
  }

  openFilterPanel(): void {
    this._draftFilters.set({ ...this._appliedFilters() });
    this.offcanvas?.show();
  }

  closeFilterPanel(): void {
    this.offcanvas?.hide();
  }

  onDraftInput(key: string, value: string): void {
    this._draftFilters.update(f => ({ ...f, [key]: value }));
  }

  applyFilters(): void {
    this._appliedFilters.set({ ...this._draftFilters() });
    this._page.set(0);
    this.emitState();
    this.closeFilterPanel();
  }

  clearAllDraft(): void {
    this._draftFilters.set({});
  }

  removeFilter(key: string): void {
    this._appliedFilters.update(f => {
      const next = { ...f };
      delete next[key];
      return next;
    });
    this._draftFilters.update(f => {
      const next = { ...f };
      delete next[key];
      return next;
    });
    this._page.set(0);
    this.emitState();
  }

  refresh(): void {
    this.emitState();
  }

  onSort(col: GridColumn): void {
    if (!col.sortable) return;
    const current = this._sort();
    if (current?.field === col.key) {
      this._sort.set({ field: col.key, direction: current.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      this._sort.set({ field: col.key, direction: 'asc' });
    }
    this._page.set(0);
    this.emitState();
  }

  onPageChange(page: number): void {
    this._page.set(page);
    this.emitState();
  }

  onSizeChange(size: number): void {
    this._size.set(size);
    this._page.set(0);
    this.emitState();
  }

  getCell(row: unknown, key: string): unknown {
    return (row as Record<string, unknown>)[key];
  }

  private emitState(): void {
    const cleanFilters: Record<string, string> = {};
    for (const [k, v] of Object.entries(this._appliedFilters())) {
      if (v) cleanFilters[k] = v;
    }
    this.stateChange.emit({
      filters: cleanFilters,
      sort: this._sort(),
      page: this._page(),
      size: this._size(),
    });
  }

  private get offcanvas(): { show(): void; hide(): void } | null {
    if (!isPlatformBrowser(this.platformId) || !this.filterPanelRef?.nativeElement) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BootstrapOffcanvas = (window as any).bootstrap?.Offcanvas;
    if (!BootstrapOffcanvas) return null;
    if (!this.bsOffcanvas) {
      this.bsOffcanvas = new BootstrapOffcanvas(this.filterPanelRef.nativeElement) as {
        show(): void;
        hide(): void;
      };
    }
    return this.bsOffcanvas;
  }
}
