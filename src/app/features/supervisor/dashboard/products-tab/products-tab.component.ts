import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { Page } from '../../../../core/models/user.models';
import { ShiftItem } from '../../../../core/models/catalog.models';
import { ProductRowResponse } from '../../../../core/models/supervisor.models';
import { GridColumn, GridFilterField, GridState } from '../../../../shared/grid/grid.models';
import { GridComponent } from '../../../../shared/grid/grid.component';

@Component({
  selector: 'app-products-tab',
  imports: [GridComponent],
  templateUrl: './products-tab.component.html',
})
export class ProductsTabComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  @Input() shifts: ShiftItem[] = [];

  private readonly _pageData = signal<Page<ProductRowResponse> | null>(null);
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
    { key: 'stopCount',      label: 'Stops',         sortable: true,  type: 'text' },
    { key: 'deviationDetails', label: 'Deviation',   sortable: false, type: 'text' },
    { key: 'holdDetails',    label: 'Hold',          sortable: false, type: 'text' },
  ];

  get gridFilters(): GridFilterField[] { return [
    { key: 'fromDate',      label: 'From Date',      type: 'date' },
    { key: 'toDate',        label: 'To Date',        type: 'date' },
    { key: 'shiftId',       label: 'Shift',          type: 'select', options: [
        { label: 'All shifts', value: '' },
        ...this.shifts.map(s => ({ label: s.name, value: s.id })),
    ]},
    { key: 'staffEmail',    label: 'Staff Email',    type: 'text', placeholder: 'Filter by email…' },
    { key: 'staffName',     label: 'Staff Name',     type: 'text', placeholder: 'Filter by name…' },
  ]; }

  ngOnInit(): void {}

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
