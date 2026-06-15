import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { Page } from '../../../../core/models/user.models';
import { ProductRowResponse } from '../../../../core/models/supervisor.models';
import { GridColumn, GridFilterField, GridState } from '../../../../shared/grid/grid.models';
import { GridComponent } from '../../../../shared/grid/grid.component';

@Component({
  selector: 'app-products-tab',
  imports: [GridComponent],
  templateUrl: './products-tab.component.html',
})
export class ProductsTabComponent {
  private readonly http       = inject(HttpClient);
  protected readonly base     = environment.apiUrl;

  private readonly _pageData  = signal<Page<ProductRowResponse> | null>(null);
  get rows()          { return this._pageData()?.content ?? []; }
  get totalElements() { return this._pageData()?.totalElements ?? 0; }
  get totalPages()    { return this._pageData()?.totalPages ?? 0; }
  readonly loading    = signal(false);

  private _state: GridState = { filters: {}, sort: null, page: 0, size: 10 };

  readonly gridColumns: GridColumn[] = [
    { key: 'staffName',      label: 'Staff',        sortable: true,  type: 'text' },
    { key: 'staffEmail',     label: 'Email',        sortable: true,  type: 'text' },
    { key: 'reportDate',     label: 'Date',          sortable: true,  type: 'text' },
    { key: 'shiftName',      label: 'Shift',         sortable: true,  type: 'text' },
    { key: 'machineName',    label: 'Machine',       sortable: true,  type: 'text' },
    { key: 'machineStatus',  label: 'Status',        sortable: true,  type: 'badge',
      badgeClass: (v) => {
        if (v === 'RUNNING')     return 'bg-success';
        if (v === 'STOPPED')     return 'bg-danger';
        if (v === 'MAINTENANCE') return 'bg-warning text-dark';
        return 'bg-primary';
      }},
    { key: 'productName',    label: 'Product',       sortable: true,  type: 'text' },
    { key: 'batchNo',        label: 'Batch No.',     sortable: true,  type: 'text' },
    { key: 'outputUnits',    label: 'Output',        sortable: true,  type: 'text' },
    { key: 'stopCount',      label: 'Stops',         sortable: false, type: 'text' },
    { key: 'deviationDetails', label: 'Deviation',   sortable: false, type: 'text' },
    { key: 'holdDetails',    label: 'Hold',          sortable: false, type: 'text' },
  ];

  readonly gridFilters: GridFilterField[] = [
    { key: 'dateRange', label: 'Date', type: 'daterange', fromKey: 'fromDate', toKey: 'toDate' },
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
      key: 'machineStatus',
      label: 'Machine Status',
      type: 'searchable-select',
      options: [
        { label: 'Running',     value: 'RUNNING'     },
        { label: 'Stopped',     value: 'STOPPED'     },
        { label: 'Maintenance', value: 'MAINTENANCE' },
        { label: 'Ready',       value: 'READY'       },
      ],
      placeholder: 'Search status...',
    },
    {
      key: 'machineName',
      label: 'Machine',
      type: 'searchable-select',
      searchUrl: `${this.base}/api/supervisor/machines`,
      searchParam: 'name',
      labelFn: (m: any) => m.name,
      valueFn: (m: any) => m.name,
      placeholder: 'Search machine...',
    },
  ];

  onGridStateChange(state: GridState): void {
    this._state = state;
    this.load(state);
  }

  load(state: GridState = this._state): void {
    this.loading.set(true);
    this.http.get<Page<ProductRowResponse>>(`${this.base}/api/supervisor/work-reports/products`, {
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
