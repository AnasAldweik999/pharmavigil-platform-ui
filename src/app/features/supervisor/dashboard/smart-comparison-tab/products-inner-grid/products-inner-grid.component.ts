import { Component, computed, EventEmitter, inject, Input, OnChanges, OnInit, Output, signal, SimpleChanges } from '@angular/core';
import { GridColumn, GridState } from '../../../../../shared/grid/grid.models';
import { GridComponent } from '../../../../../shared/grid/grid.component';
import { SmartComparisonService } from '../../../../../core/services/smart-comparison.service';
import { SmartGroupBy } from '../../../../../core/models/smart-comparison.models';

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

  readonly rows         = signal<unknown[]>([]);
  readonly totalElements = signal(0);
  readonly totalPages   = signal(0);
  readonly loading      = signal(false);
  private  currentPage  = 0;
  private  currentSize  = 10;

  readonly columns = computed<GridColumn[]>(() => {
    const shared: GridColumn[] = [
      { key: 'machineStatus', label: 'Status', type: 'badge',
        badgeClass: v => v === 'RUNNING' ? 'bg-success' : v === 'STOPPED' ? 'bg-danger' : v === 'MAINTENANCE' ? 'bg-warning text-dark' : 'bg-secondary' },
      { key: 'workingDate',   label: 'Working Date', type: 'date-only' },
      { key: 'productName',   label: 'Product' },
      { key: 'batchNumber',   label: 'Batch No.' },
      { key: 'outputUnits',   label: 'Output Units' },
      { key: 'stopCount',     label: 'Stops' },
      { key: 'duration',      label: 'Downtime Count (min)' },
      { key: 'stopNames',     label: 'Stop Names' },
      { key: 'deviation',     label: 'Deviation' },
      { key: 'hold',          label: 'Hold' },
    ];

    switch (this.groupBy) {
      case 'MACHINE':
        return [
          { key: 'staffName',  label: 'Staff Name' },
          { key: 'staffEmail', label: 'Email' },
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
          { key: 'staffEmail',  label: 'Email' },
          ...shared,
        ];
      case 'DATE':
        return [
          { key: 'machineName', label: 'Machine' },
          { key: 'staffName',   label: 'Staff Name' },
          { key: 'staffEmail',  label: 'Email' },
          { key: 'shiftName',   label: 'Shift' },
          ...shared.filter(c => c.key !== 'workingDate'),
        ];
    }
  });

  ngOnInit(): void {
    this.load(0, 10);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['baseUrl'] && !changes['baseUrl'].firstChange) {
      this.rows.set([]);
      this.totalElements.set(0);
      this.totalPages.set(0);
      this.load(0, 10);
    }
  }

  onStateChange(state: GridState): void {
    this.load(state.page, state.size);
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
}
