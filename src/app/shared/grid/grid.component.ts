import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { DatePipe, isPlatformBrowser, NgClass } from '@angular/common';
import { GridAction, GridColumn, GridFilterField, GridSortState, GridState } from './grid.models';
import { DateRangePickerComponent } from '../date-range-picker/date-range-picker.component';
import { SearchableDropdownComponent } from '../searchable-dropdown/searchable-dropdown.component';

@Component({
  selector: 'app-grid',
  imports: [DatePipe, NgClass, DateRangePickerComponent, SearchableDropdownComponent],
  templateUrl: './grid.component.html',
})
export class GridComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
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
  @Input() defaultSort: GridSortState | null = null;

  @Output() stateChange  = new EventEmitter<GridState>();
  @Output() actionClick  = new EventEmitter<{ action: GridAction; row: unknown }>();

  @ViewChild('filterPanel') private filterPanelRef!: ElementRef<HTMLElement>;
  @ViewChild('colPanel')    private colPanelRef!: ElementRef<HTMLElement>;
  private readonly platformId = inject(PLATFORM_ID);
  private bsOffcanvas: { show(): void; hide(): void } | null = null;
  private bsColPanel:  { show(): void; hide(): void } | null = null;

  // ── Filter signals ────────────────────────────────────────────────────────
  private readonly _sort           = signal<GridSortState | null>(null);
  private readonly _page           = signal(0);
  private readonly _size           = signal(10);
  private readonly _draftFilters   = signal<Record<string, string>>({});
  private readonly _appliedFilters = signal<Record<string, string>>({});
  private readonly _draftLabels    = signal<Record<string, string>>({});
  private readonly _appliedLabels  = signal<Record<string, string>>({});

  // ── Column visibility signals ─────────────────────────────────────────────
  readonly allColumns   = signal<GridColumn[]>([]);   // all columns (for panel list)
  private readonly _visibleKeys = signal<Set<string>>(new Set());
  private readonly _draftKeys   = signal<Set<string>>(new Set());

  // ── Column resize state ───────────────────────────────────────────────────
  private readonly _colWidths = signal<Map<string, number>>(new Map());
  private _resizeKey    = '';
  private _resizeStartX = 0;
  private _resizeStartW = 0;
  private readonly _onResizeMove = (e: MouseEvent) => this.handleResizeMove(e);
  private readonly _onResizeUp   = ()              => this.handleResizeUp();

  readonly defaultLabelFn = (item: any) => item.label ?? item.name ?? String(item);
  readonly defaultValueFn = (item: any) => item.value ?? item.id  ?? String(item);

  readonly sortField     = computed(() => this._sort()?.field ?? null);
  readonly sortDirection = computed(() => this._sort()?.direction ?? null);
  readonly currentPage   = computed(() => this._page());
  readonly currentSize   = computed(() => this._size());
  readonly draftFilters      = this._draftFilters.asReadonly();
  readonly draftFilterCount  = computed(() =>
    Object.values(this._draftFilters()).filter(Boolean).length
  );

  readonly appliedFilterEntries = computed(() => {
    const applied = this._appliedFilters();
    const result: { keys: string[]; label: string; displayValue: string }[] = [];
    for (const field of this.filterFields) {
      if (field.type === 'daterange') {
        const fromVal = field.fromKey ? (applied[field.fromKey] ?? '') : '';
        const toVal   = field.toKey   ? (applied[field.toKey]   ?? '') : '';
        if (!fromVal && !toVal) continue;
        const parts = [fromVal, toVal].filter(Boolean);
        result.push({ keys: [field.fromKey!, field.toKey!], label: field.label, displayValue: parts.join(' → ') });
      } else {
        const value = applied[field.key];
        if (!value) continue;
        let displayValue: string;
        if (field.type === 'select') {
          displayValue = field.options?.find(o => o.value === value)?.label ?? value;
        } else if (field.type === 'searchable-select') {
          displayValue = this._appliedLabels()[field.key] ?? value;
        } else {
          displayValue = value;
        }
        result.push({ keys: [field.key], label: field.label, displayValue });
      }
    }
    return result;
  });

  readonly pageNumbers = computed(() => {
    const total   = this.totalPages;
    const current = this._page();
    if (total <= 1) return [];
    const range: number[] = [];
    const delta = 2;
    const start = Math.max(0, current - delta);
    const end   = Math.min(total - 1, current + delta);
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

  readonly displayColumns = computed(() =>
    this.allColumns().filter(c => this._visibleKeys().has(c.key))
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns']) {
      const allKeys = new Set(this.columns.map(c => c.key));
      this.allColumns.set([...this.columns]);
      this._visibleKeys.set(new Set(allKeys));
      this._draftKeys.set(new Set(allKeys));
      this._colWidths.set(new Map());
    }
  }

  ngOnInit(): void {
    this._size.set(this.pageSize);
    if (this.defaultSort) this._sort.set(this.defaultSort);
    if (Object.keys(this.initialFilters).length) {
      this._appliedFilters.set({ ...this.initialFilters });
      this._draftFilters.set({ ...this.initialFilters });
    }
    this.emitState();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    // Move offcanvas panels to <body> so Bootstrap's position:fixed is relative
    // to the viewport — not to a transformed ancestor in the layout tree.
    if (this.filterPanelRef?.nativeElement) {
      document.body.appendChild(this.filterPanelRef.nativeElement);
    }
    if (this.colPanelRef?.nativeElement) {
      document.body.appendChild(this.colPanelRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    // Remove panels that were appended to body
    [this.filterPanelRef, this.colPanelRef].forEach(ref => {
      const el = ref?.nativeElement;
      if (el && el.parentNode === document.body) {
        document.body.removeChild(el);
      }
    });
    document.removeEventListener('mousemove', this._onResizeMove);
    document.removeEventListener('mouseup',   this._onResizeUp);
    document.body.classList.remove('pv-resizing');
  }

  // ── Filter panel ──────────────────────────────────────────────────────────

  openFilterPanel(): void {
    this._draftFilters.set({ ...this._appliedFilters() });
    this._draftLabels.set({ ...this._appliedLabels() });
    this.offcanvas?.show();
  }

  closeFilterPanel(): void {
    this.offcanvas?.hide();
  }

  onDraftInput(key: string, value: string): void {
    this._draftFilters.update(f => ({ ...f, [key]: value }));
  }

  onDraftDateRange(fromKey: string, toKey: string, from: string, to: string): void {
    this._draftFilters.update(f => ({ ...f, [fromKey]: from, [toKey]: to }));
  }

  applyFilters(): void {
    this._appliedFilters.set({ ...this._draftFilters() });
    this._appliedLabels.set({ ...this._draftLabels() });
    this._page.set(0);
    this.emitState();
    this.closeFilterPanel();
  }

  clearAllDraft(): void {
    this._draftFilters.set({});
    this._draftLabels.set({});
  }

  removeFilterKeys(keys: string[]): void {
    this._appliedFilters.update(f => { const n = { ...f }; keys.forEach(k => delete n[k]); return n; });
    this._draftFilters.update(f => { const n = { ...f }; keys.forEach(k => delete n[k]); return n; });
    this._appliedLabels.update(m => { const n = { ...m }; keys.forEach(k => delete n[k]); return n; });
    this._draftLabels.update(m => { const n = { ...m }; keys.forEach(k => delete n[k]); return n; });
    this._page.set(0);
    this.emitState();
  }

  onDraftLabel(key: string, label: string): void {
    this._draftLabels.update(m => ({ ...m, [key]: label }));
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

  // ── Column visibility panel ───────────────────────────────────────────────

  openColPanel(): void {
    this._draftKeys.set(new Set(this._visibleKeys()));
    this.colPanelInstance?.show();
  }

  closeColPanel(): void {
    this.colPanelInstance?.hide();
  }

  applyColPanel(): void {
    this._visibleKeys.set(new Set(this._draftKeys()));
    this.closeColPanel();
  }

  toggleDraftCol(key: string): void {
    this._draftKeys.update(s => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  isDraftColChecked(key: string): boolean {
    return this._draftKeys().has(key);
  }

  resetDraftCols(): void {
    this._draftKeys.set(new Set(this.allColumns().map(c => c.key)));
  }

  // ── Column resize ─────────────────────────────────────────────────────────

  getColWidth(key: string): string | null {
    const w = this._colWidths().get(key);
    return w != null ? `${w}px` : null;
  }

  onResizeStart(event: MouseEvent, key: string): void {
    event.preventDefault();
    event.stopPropagation();
    const th = (event.target as HTMLElement).closest('th') as HTMLElement;
    if (!th) return;
    this._resizeKey    = key;
    this._resizeStartX = event.clientX;
    this._resizeStartW = th.offsetWidth;
    document.addEventListener('mousemove', this._onResizeMove);
    document.addEventListener('mouseup',   this._onResizeUp);
    document.body.classList.add('pv-resizing');
  }

  private handleResizeMove(e: MouseEvent): void {
    const newW = Math.max(60, this._resizeStartW + (e.clientX - this._resizeStartX));
    this._colWidths.update(m => { const n = new Map(m); n.set(this._resizeKey, newW); return n; });
  }

  private handleResizeUp(): void {
    document.removeEventListener('mousemove', this._onResizeMove);
    document.removeEventListener('mouseup',   this._onResizeUp);
    document.body.classList.remove('pv-resizing');
    this._resizeKey = '';
  }

  // ── Private helpers ───────────────────────────────────────────────────────

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

  private get colPanelInstance(): { show(): void; hide(): void } | null {
    if (!isPlatformBrowser(this.platformId) || !this.colPanelRef?.nativeElement) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BootstrapOffcanvas = (window as any).bootstrap?.Offcanvas;
    if (!BootstrapOffcanvas) return null;
    if (!this.bsColPanel) {
      this.bsColPanel = new BootstrapOffcanvas(this.colPanelRef.nativeElement) as {
        show(): void;
        hide(): void;
      };
    }
    return this.bsColPanel;
  }
}
