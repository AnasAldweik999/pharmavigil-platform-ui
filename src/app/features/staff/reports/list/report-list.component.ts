import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { Page } from '../../../../core/models/user.models';
import { WorkReportResponse, ShiftRef } from '../../../../core/models/work-report.models';
import { GridAction, GridColumn, GridFilterField, GridState } from '../../../../shared/grid/grid.models';
import { GridComponent } from '../../../../shared/grid/grid.component';
import { ReportDetailModalComponent } from '../detail/report-detail-modal.component';

@Component({
  selector: 'app-report-list',
  imports: [GridComponent, RouterLink, ReportDetailModalComponent],
  templateUrl: './report-list.component.html',
})
export class ReportListComponent implements OnInit {
  private readonly http    = inject(HttpClient);
  private readonly base    = environment.apiUrl;

  @ViewChild('detailModal') detailModal!: ReportDetailModalComponent;

  private readonly _pageData = signal<Page<WorkReportResponse> | null>(null);
  readonly rows          = computed(() => this._pageData()?.content ?? []);
  readonly totalElements = computed(() => this._pageData()?.totalElements ?? 0);
  readonly totalPages    = computed(() => this._pageData()?.totalPages ?? 0);

  readonly loading    = signal(false);
  readonly viewingId  = signal<string | null>(null);
  readonly shifts     = signal<ShiftRef[]>([]);

  private _currentState: GridState = { filters: {}, sort: null, page: 0, size: 10 };

  readonly gridColumns: GridColumn[] = [
    { key: 'reportDate', label: 'Date',      sortable: true, type: 'text' },
    { key: 'shiftName',  label: 'Shift',     sortable: false, type: 'text' },
    { key: 'createdAt',  label: 'Submitted', sortable: true, type: 'date' },
  ];

  readonly gridFilters = computed<GridFilterField[]>(() => [
    { key: 'dateRange', label: 'Date', type: 'daterange', fromKey: 'fromDate', toKey: 'toDate' },
    {
      key: 'shiftId',
      label: 'Shift',
      type: 'select',
      options: [
        { label: 'All shifts', value: '' },
        ...this.shifts().map(s => ({ label: s.name, value: s.id })),
      ],
    },
  ]);

  readonly gridActions: GridAction[] = [
    { key: 'view', label: 'View', btnClass: 'btn-outline-secondary' },
  ];

  ngOnInit(): void {
    this.http.get<ShiftRef[]>(`${this.base}/api/staff/reference/shifts`).subscribe({
      next: (list) => this.shifts.set(list),
    });
  }

  onGridStateChange(state: GridState): void {
    this._currentState = state;
    this.loadReports(state);
  }

  onGridAction(event: { action: GridAction; row: unknown }): void {
    if (event.action.key === 'view') {
      const report = event.row as WorkReportResponse;
      this.viewingId.set(report.id);
      this.detailModal.open(report);
      this.viewingId.set(null);
    }
  }

  private loadReports(state: GridState): void {
    this.loading.set(true);
    let p = new HttpParams()
      .set('page', state.page.toString())
      .set('size', state.size.toString());
    if (state.sort) p = p.set('sort', `${state.sort.field},${state.sort.direction}`);
    for (const [k, v] of Object.entries(state.filters)) { if (v) p = p.set(k, v); }
    this.http.get<Page<WorkReportResponse>>(`${this.base}/api/staff/work-reports`, { params: p }).subscribe({
      next:  (page) => { this._pageData.set(page); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
