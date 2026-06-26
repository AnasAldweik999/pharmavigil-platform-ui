import {
  Component,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment.staff';
import { Page } from '../../../../core/models/user.models';
import { SupervisorReportListItem } from '../../../../core/models/supervisor.models';
import { WorkReportResponse } from '../../../../core/models/work-report.models';
import { GridAction, GridColumn, GridFilterField, GridState } from '../../../../shared/grid/grid.models';
import { GridComponent } from '../../../../shared/grid/grid.component';
import { ReportDetailModalComponent } from '../../../staff/reports/detail/report-detail-modal.component';

@Component({
  selector: 'app-reports-tab',
  imports: [GridComponent, ReportDetailModalComponent],
  templateUrl: './reports-tab.component.html',
})
export class ReportsTabComponent {
  private readonly http       = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base       = environment.apiUrl;

  @ViewChild('detailModal') detailModal!: ReportDetailModalComponent;

  private readonly _pageData = signal<Page<SupervisorReportListItem> | null>(null);
  get rows()          { return this._pageData()?.content ?? []; }
  get totalElements() { return this._pageData()?.totalElements ?? 0; }
  get totalPages()    { return this._pageData()?.totalPages ?? 0; }
  readonly loading       = signal(false);
  readonly viewLoading   = signal(false);

  private _state: GridState = { filters: {}, sort: null, page: 0, size: 10 };

  readonly gridColumns: GridColumn[] = [
    { key: 'staffName',  label: 'Staff Name',   sortable: true, type: 'text' },
    { key: 'staffEmail', label: 'Email',         sortable: true, type: 'text', hidden: true },
    { key: 'reportDate', label: 'Working Date',  sortable: true, type: 'text' },
    { key: 'shiftName',  label: 'Shift',         sortable: true, type: 'text' },
    { key: 'createdAt',  label: 'Submitted At',  sortable: true, type: 'date' },
  ];

  readonly gridFilters: GridFilterField[] = [
    { key: 'dateRange', label: 'Working Date', type: 'daterange', fromKey: 'fromDate', toKey: 'toDate' },
    {
      key: 'shiftId',
      label: 'Shift',
      type: 'searchable-select',
      searchUrl: `${this.base}/api/supervisor/shifts`,
      searchParam: 'name',
      labelFn: (s: any) => s.name,
      valueFn: (s: any) => s.id,
      placeholder: 'Search shift...',
    },
    {
      key: 'staffEmail',
      label: 'Staff',
      type: 'searchable-select',
      searchUrl: `${this.base}/api/supervisor/staff-users`,
      searchParam: 'search',
      labelFn: (u: any) => u.name,
      secondaryLabelFn: (u: any) => u.email,
      valueFn: (u: any) => u.email,
      placeholder: 'Search staff...',
    },
  ];

  readonly gridActions: GridAction[] = [
    { key: 'view', label: 'View', btnClass: 'btn-outline-primary', icon: 'view' },
  ];

  onGridStateChange(state: GridState): void {
    this._state = state;
    this.load(state);
  }

  onGridAction(event: { action: GridAction; row: unknown }): void {
    if (event.action.key !== 'view') return;
    const item = event.row as SupervisorReportListItem;
    if (!isPlatformBrowser(this.platformId)) return;
    this.viewLoading.set(true);
    this.http.get<WorkReportResponse>(`${this.base}/api/supervisor/work-reports/${item.id}`).subscribe({
      next: (report) => {
        this.viewLoading.set(false);
        this.detailModal.open(report);
      },
      error: () => this.viewLoading.set(false),
    });
  }

  load(state: GridState = this._state): void {
    this.loading.set(true);
    this.http.get<Page<SupervisorReportListItem>>(`${this.base}/api/supervisor/work-reports`, {
      params: this.buildParams(state),
    }).subscribe({
      next: (page) => { this._pageData.set(page); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
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
