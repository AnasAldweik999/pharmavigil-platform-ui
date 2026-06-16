import { Component, computed, EventEmitter, inject, Input, OnChanges, OnInit, Output, signal, SimpleChanges } from '@angular/core';
import { GridColumn, GridState } from '../../../../../shared/grid/grid.models';
import { GridComponent } from '../../../../../shared/grid/grid.component';
import { SmartComparisonService } from '../../../../../core/services/smart-comparison.service';
import { SmartGroupBy } from '../../../../../core/models/smart-comparison.models';

@Component({
  selector: 'app-incidents-inner-grid',
  imports: [GridComponent],
  templateUrl: './incidents-inner-grid.component.html',
})
export class IncidentsInnerGridComponent implements OnInit, OnChanges {
  @Input({ required: true }) baseUrl!: string;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) groupBy!: SmartGroupBy;

  @Output() closed = new EventEmitter<void>();

  private readonly service = inject(SmartComparisonService);

  readonly rows          = signal<unknown[]>([]);
  readonly totalElements = signal(0);
  readonly totalPages    = signal(0);
  readonly loading       = signal(false);

  readonly columns = computed<GridColumn[]>(() => {
    switch (this.groupBy) {
      case 'MACHINE':
        return [
          { key: 'staffName',   label: 'Staff Name' },
          { key: 'staffEmail',  label: 'Email' },
          { key: 'workingDate', label: 'Working Date', type: 'date-only' },
          { key: 'shiftName',   label: 'Shift' },
          { key: 'incidentText', label: 'Incident' },
        ];
      case 'STAFF':
        return [
          { key: 'machineName', label: 'Machine' },
          { key: 'workingDate', label: 'Working Date', type: 'date-only' },
          { key: 'shiftName',   label: 'Shift' },
          { key: 'incidentText', label: 'Incident' },
        ];
      case 'SHIFT':
        return [
          { key: 'machineName', label: 'Machine' },
          { key: 'staffName',   label: 'Staff Name' },
          { key: 'staffEmail',  label: 'Email' },
          { key: 'workingDate', label: 'Working Date', type: 'date-only' },
          { key: 'incidentText', label: 'Incident' },
        ];
      case 'DATE':
        return [
          { key: 'machineName', label: 'Machine' },
          { key: 'staffName',   label: 'Staff Name' },
          { key: 'staffEmail',  label: 'Email' },
          { key: 'shiftName',   label: 'Shift' },
          { key: 'incidentText', label: 'Incident' },
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
