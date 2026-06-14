import { Component, computed, inject, Input, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, TitleCasePipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, ChartType as ChartJsType } from 'chart.js';
import { environment } from '../../../../../environments/environment';
import { CatalogItem, ShiftItem } from '../../../../core/models/catalog.models';
import { DashboardSummaryResponse, SummaryGroupBy } from '../../../../core/models/supervisor.models';
import { DateRangePickerComponent } from '../../../../shared/date-range-picker/date-range-picker.component';

@Component({
  selector: 'app-summary-tab',
  imports: [ReactiveFormsModule, BaseChartDirective, TitleCasePipe, DateRangePickerComponent],
  templateUrl: './summary-tab.component.html',
})
export class SummaryTabComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb   = inject(FormBuilder);
  private readonly base = environment.apiUrl;
  readonly isBrowser    = isPlatformBrowser(inject(PLATFORM_ID));

  @Input() shifts: ShiftItem[] = [];

  readonly form = this.fb.nonNullable.group({
    fromDate:    [new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-CA')],
    toDate:      [new Date().toLocaleDateString('en-CA')],
    shiftId:     [''],
    staffEmail:  [''],
    machineName: [''],
    groupBy:     ['' as SummaryGroupBy | ''],
  });

  readonly machines           = signal<CatalogItem[]>([]);
  readonly summaryData        = signal<DashboardSummaryResponse[]>([]);
  readonly loading            = signal(false);
  readonly selectedChartType  = signal<ChartJsType>('bar');
  readonly logScale           = signal(false);

  readonly chartTypeOptions: ChartJsType[] = ['bar', 'line', 'pie', 'doughnut'];

  readonly groupByOptions: { label: string; value: SummaryGroupBy | '' }[] = [
    { label: 'None (totals only)', value: '' },
    { label: 'By Date',  value: 'DATE' },
    { label: 'By Shift', value: 'SHIFT' },
    { label: 'By User',  value: 'USER' },
  ];

  readonly totals = computed(() => {
    const data = this.summaryData();
    return {
      products:    data.reduce((s, r) => s + r.totalProducts, 0),
      outputUnits: data.reduce((s, r) => s + r.totalOutputUnits, 0),
      stops:       data.reduce((s, r) => s + r.totalStops, 0),
      downtime:    data.reduce((s, r) => s + r.totalDowntimeMinutes, 0),
      incidents:   data.reduce((s, r) => s + r.totalIncidents, 0),
    };
  });

  readonly chartData = computed<ChartData>(() => {
    const data = this.summaryData();
    if (!data.length) return { labels: [], datasets: [] };
    return {
      labels: data.map(d => d.group || 'All Time'),
      datasets: [
        { label: 'Products',       data: data.map(d => d.totalProducts),        backgroundColor: 'rgba(13,110,253,0.7)',   borderColor: 'rgba(13,110,253,1)',  fill: false },
        { label: 'Output Units',   data: data.map(d => d.totalOutputUnits),     backgroundColor: 'rgba(25,135,84,0.7)',    borderColor: 'rgba(25,135,84,1)',   fill: false },
        { label: 'Stops',          data: data.map(d => d.totalStops),           backgroundColor: 'rgba(255,193,7,0.85)',   borderColor: 'rgba(255,193,7,1)',   fill: false },
        { label: 'Downtime (min)', data: data.map(d => d.totalDowntimeMinutes), backgroundColor: 'rgba(220,53,69,0.7)',    borderColor: 'rgba(220,53,69,1)',   fill: false },
        { label: 'Incidents',      data: data.map(d => d.totalIncidents),       backgroundColor: 'rgba(111,66,193,0.75)',  borderColor: 'rgba(111,66,193,1)',  fill: false },
      ],
    };
  });

  readonly chartOptions = computed<ChartOptions>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      x: { grid: { display: false } },
      y: this.logScale()
        ? { type: 'logarithmic', min: 0.5, grid: { color: 'rgba(0,0,0,0.05)' } }
        : { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
    },
  }));

  onDateRangeChange(range: { from: string; to: string }): void {
    this.form.patchValue({ fromDate: range.from, toDate: range.to });
  }

  setChartType(type: ChartJsType): void {
    this.selectedChartType.set(type);
    if (type === 'pie' || type === 'doughnut') this.logScale.set(false);
  }

  ngOnInit(): void {
    this.http.get<{ content: CatalogItem[] }>(`${this.base}/api/supervisor/machines?size=1000&sort=name,asc`).subscribe({
      next: (page) => this.machines.set(page.content),
    });
    this.loadSummary();
  }

  loadSummary(): void {
    const v = this.form.getRawValue();
    let params = new HttpParams();
    if (v.fromDate)    params = params.set('fromDate',    v.fromDate);
    if (v.toDate)      params = params.set('toDate',      v.toDate);
    if (v.shiftId)     params = params.set('shiftId',     v.shiftId);
    if (v.staffEmail)  params = params.set('staffEmail',  v.staffEmail);
    if (v.machineName) params = params.set('machineName', v.machineName);
    if (v.groupBy)     params = params.set('groupBy',     v.groupBy);

    this.loading.set(true);
    this.http.get<DashboardSummaryResponse[]>(`${this.base}/api/supervisor/work-reports/summary`, { params }).subscribe({
      next: (data) => {
        this.summaryData.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
