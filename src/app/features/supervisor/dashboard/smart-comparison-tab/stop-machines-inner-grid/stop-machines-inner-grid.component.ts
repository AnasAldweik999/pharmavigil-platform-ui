import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, signal, SimpleChanges } from '@angular/core';
import { GridAction, GridColumn, GridState } from '../../../../../shared/grid/grid.models';
import { GridComponent } from '../../../../../shared/grid/grid.component';
import { SmartComparisonService } from '../../../../../core/services/smart-comparison.service';
import { StopProductRow } from '../../../../../core/models/smart-comparison.models';

@Component({
  selector: 'app-stop-machines-inner-grid',
  imports: [GridComponent],
  templateUrl: './stop-machines-inner-grid.component.html',
})
export class StopMachinesInnerGridComponent implements OnInit, OnChanges {
  @Input({ required: true }) baseUrl!: string;
  @Input({ required: true }) title!: string;

  @Output() closed = new EventEmitter<void>();

  private readonly service = inject(SmartComparisonService);

  // ── Machines grid state ───────────────────────────────────────────────────
  readonly rows          = signal<unknown[]>([]);
  readonly totalElements = signal(0);
  readonly totalPages    = signal(0);
  readonly loading       = signal(false);

  readonly columns: GridColumn[] = [
    { key: 'machineName',          label: 'Machine'        },
    { key: 'machineStatus',        label: 'Status', type: 'badge',
      badgeClass: (v: any) => v === 'RUNNING' ? 'bg-success' : v === 'STOPPED' ? 'bg-danger' : v === 'MAINTENANCE' ? 'bg-warning text-dark' : 'bg-secondary' },
    { key: 'staffName',            label: 'Staff'          },
    { key: 'staffEmail',           label: 'Email', hidden: true },
    { key: 'shift',                label: 'Shift'          },
    { key: 'workingDate',          label: 'Date', type: 'date-only' },
    { key: 'totalProducts',        label: 'Products'       },
    { key: 'totalDowntimeMinutes', label: 'Downtime (min)' },
  ];

  readonly gridActions: GridAction[] = [
    { key: 'products', label: 'Products', icon: 'products', btnClass: 'btn-sm btn-outline-primary',
      condition: (row: any) => (row.totalProducts ?? 0) > 0 },
  ];

  // ── Products sub-grid state ───────────────────────────────────────────────
  readonly activeProductsUrl = signal<string | null>(null);
  readonly productsTitle     = signal('');
  readonly productsRows      = signal<StopProductRow[]>([]);
  readonly productsTotal     = signal(0);
  readonly productsPages     = signal(0);
  readonly productsLoading   = signal(false);

  readonly productsColumns: GridColumn[] = [
    { key: 'productName', label: 'Product'      },
    { key: 'batchNo',     label: 'Batch Number' },
  ];

  ngOnInit(): void {
    this.load(0, 10);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['baseUrl'] && !changes['baseUrl'].firstChange) {
      this.rows.set([]);
      this.totalElements.set(0);
      this.totalPages.set(0);
      this.activeProductsUrl.set(null);
      this.load(0, 10);
    }
  }

  onStateChange(state: GridState): void {
    this.load(state.page, state.size);
  }

  onProductActionClick(event: { action: GridAction; row: unknown }): void {
    const r   = event.row as any;
    const url = r._links?.['products'] ?? null;
    if (!url) return;

    if (this.activeProductsUrl() === url) {
      this.activeProductsUrl.set(null);
    } else {
      this.productsTitle.set(r.machineName ?? '');
      this.activeProductsUrl.set(url);
      this.loadProducts(0, 10);
    }
  }

  onProductsStateChange(state: GridState): void {
    this.loadProducts(state.page, state.size);
  }

  private load(page: number, size: number): void {
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

  private loadProducts(page: number, size: number): void {
    const url = this.activeProductsUrl();
    if (!url) return;
    this.productsLoading.set(true);
    this.service.getInnerGrid<StopProductRow>(url, page, size).subscribe({
      next: res => {
        this.productsRows.set(res.content);
        this.productsTotal.set(res.totalElements);
        this.productsPages.set(res.totalPages);
        this.productsLoading.set(false);
      },
      error: () => this.productsLoading.set(false),
    });
  }
}
