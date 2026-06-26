import { Component, computed, EventEmitter, inject, Input, OnChanges, OnInit, Output, signal, SimpleChanges } from '@angular/core';
import { GridAction, GridColumn, GridState } from '../../../../../shared/grid/grid.models';
import { GridComponent } from '../../../../../shared/grid/grid.component';
import { SmartComparisonService } from '../../../../../core/services/smart-comparison.service';
import { ProductStopRow, SmartGroupBy } from '../../../../../core/models/smart-comparison.models';

@Component({
  selector: 'app-products-inner-grid',
  imports: [GridComponent],
  templateUrl: './products-inner-grid.component.html',
})
export class ProductsInnerGridComponent implements OnInit, OnChanges {
  @Input({ required: true }) baseUrl!: string;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) groupBy!: SmartGroupBy;

  @Output() closed = new EventEmitter<void>();

  private readonly service = inject(SmartComparisonService);

  // ── Products grid state ───────────────────────────────────────────────────
  readonly rows          = signal<unknown[]>([]);
  readonly totalElements = signal(0);
  readonly totalPages    = signal(0);
  readonly loading       = signal(false);
  private  currentPage   = 0;
  private  currentSize   = 10;

  readonly gridActions: GridAction[] = [
    { key: 'stops', label: 'View Stops', icon: 'stops', btnClass: 'btn-sm btn-outline-warning',
      condition: (row: any) => (row.stopCount ?? 0) > 0 },
  ];

  readonly columns = computed<GridColumn[]>(() => {
    const shared: GridColumn[] = [
      { key: 'machineStatus', label: 'Status', type: 'badge',
        badgeClass: v => v === 'RUNNING' ? 'bg-success' : v === 'STOPPED' ? 'bg-danger' : v === 'MAINTENANCE' ? 'bg-warning text-dark' : 'bg-secondary' },
      { key: 'workingDate',   label: 'Working Date', type: 'date-only' },
      { key: 'productName',   label: 'Product' },
      { key: 'batchNumber',   label: 'Batch No.' },
      { key: 'outputUnits',   label: 'Output Units' },
      { key: 'stopCount',     label: 'Stops' },
      { key: 'duration',      label: 'Downtime (min)' },
      { key: 'deviation',     label: 'Deviation' },
      { key: 'hold',          label: 'Hold' },
    ];

    switch (this.groupBy) {
      case 'MACHINE':
        return [
          { key: 'staffName',  label: 'Staff Name' },
          { key: 'staffEmail', label: 'Email', hidden: true },
          { key: 'shiftName',  label: 'Shift' },
          ...shared,
        ];
      case 'STAFF':
        return [
          { key: 'machineName', label: 'Machine' },
          { key: 'shiftName',   label: 'Shift' },
          ...shared,
        ];
      case 'SHIFT':
        return [
          { key: 'machineName', label: 'Machine' },
          { key: 'staffName',   label: 'Staff Name' },
          { key: 'staffEmail',  label: 'Email', hidden: true },
          ...shared,
        ];
      case 'DATE':
      default:
        return [
          { key: 'machineName', label: 'Machine' },
          { key: 'staffName',   label: 'Staff Name' },
          { key: 'staffEmail',  label: 'Email', hidden: true },
          { key: 'shiftName',   label: 'Shift' },
          ...shared.filter(c => c.key !== 'workingDate'),
        ];
    }
  });

  // ── Stops sub-grid state ──────────────────────────────────────────────────
  readonly activeStopsUrl = signal<string | null>(null);
  readonly stopsTitle     = signal('');
  readonly stopsRows      = signal<ProductStopRow[]>([]);
  readonly stopsTotal     = signal(0);
  readonly stopsPages     = signal(0);
  readonly stopsLoading   = signal(false);

  readonly stopsColumns: GridColumn[] = [
    { key: 'stopTypeName', label: 'Stop Type' },
    { key: 'duration',     label: 'Duration (min)' },
  ];

  ngOnInit(): void {
    this.load(0, 10);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['baseUrl'] && !changes['baseUrl'].firstChange) {
      this.rows.set([]);
      this.totalElements.set(0);
      this.totalPages.set(0);
      this.activeStopsUrl.set(null);
      this.load(0, 10);
    }
  }

  onStateChange(state: GridState): void {
    this.load(state.page, state.size);
  }

  onStopActionClick(event: { action: GridAction; row: unknown }): void {
    const r   = event.row as any;
    const url = r.stopsLink ?? null;
    if (!url) return;

    if (this.activeStopsUrl() === url) {
      this.activeStopsUrl.set(null);
    } else {
      const batch = r.batchNumber ? ` — Batch ${r.batchNumber}` : '';
      this.stopsTitle.set(`${r.productName ?? ''}${batch}`);
      this.activeStopsUrl.set(url);
      this.loadStops(0, 10);
    }
  }

  onStopsStateChange(state: GridState): void {
    this.loadStops(state.page, state.size);
  }

  private load(page: number, size: number): void {
    this.currentPage = page;
    this.currentSize = size;
    this.loading.set(true);
    this.service.getInnerGrid<any>(this.baseUrl, page, size).subscribe({
      next: res => {
        this.rows.set(res.content);
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadStops(page: number, size: number): void {
    const url = this.activeStopsUrl();
    if (!url) return;
    this.stopsLoading.set(true);
    this.service.getInnerGrid<ProductStopRow>(url, page, size).subscribe({
      next: res => {
        this.stopsRows.set(res.content);
        this.stopsTotal.set(res.totalElements);
        this.stopsPages.set(res.totalPages);
        this.stopsLoading.set(false);
      },
      error: () => this.stopsLoading.set(false),
    });
  }
}
