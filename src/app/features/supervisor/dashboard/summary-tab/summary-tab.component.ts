import { Component, computed, inject, Input, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, TitleCasePipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, ChartType as ChartJsType } from 'chart.js';
import { environment } from '../../../../../environments/environment';
import { ShiftItem } from '../../../../core/models/catalog.models';
import { DashboardSummaryResponse, SummaryGroupBy } from '../../../../core/models/supervisor.models';

@Component({
  selector: 'app-summary-tab',
  imports: [ReactiveFormsModule, BaseChartDirective, TitleCasePipe],
  templateUrl: './summary-tab.component.html',
})
export class SummaryTabComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb   = inject(FormBuilder);
  private readonly base = environment.apiUrl;
  readonly isBrowser    = isPlatformBrowser(inject(PLATFORM_ID));

  @Input() shifts: ShiftItem[] = [];

  readonly form = this.fb.nonNullable.group({
    fromDate:   [''],
    toDate:     [''],
    shiftId:    [''],
    staffEmail: [''],
    groupBy:    ['' as SummaryGroupBy | ''],
  });

  readonly summaryData        = signal<DashboardSummaryResponse[]>([]);
  readonly loading            = signal(false);
  readonly selectedChartType  = signal<ChartJsType>('bar');

  readonly chartTypeOptions: ChartJsType[] = ['bar', 'line', 'pie', 'doughnut'];

  readonly groupByOptions: { label: string; value: SummaryGroupBy | '' }[] = [
    { label: 'None (totals only)', value: '' },
    { label: 'By Date',  value: 'DATE' },
    { label: 'By Shift', value: 'SHIFT' },
    { label: 'By User',  value: 'USER' },
  ];

  readonly totals = computed(() => {
    const data = this.summaryData();
    const reports   = data.reduce((s, r) => s + r.reportCount, 0);
    const downtime  = data.reduce((s, r) => s + r.totalDowntimeMinutes, 0);
    const incidents = data.reduce((s, r) => s + r.totalIncidents, 0);
    const avgDown   = data.length
      ? Math.round(data.reduce((s, r) => s + r.avgDowntimeMinutes, 0) / data.length)
      : 0;
    const machines: Record<string, number> = {};
    for (const row of data) {
      for (const [status, count] of Object.entries(row.machineCounts)) {
        machines[status] = (machines[status] ?? 0) + count;
      }
    }
    return { reports, downtime, incidents, avgDown, machines };
  });

  readonly chartData = computed<ChartData>(() => {
    const data = this.summaryData();
    if (!data.length) return { labels: [], datasets: [] };
    return {
      labels: data.map(d => d.group || 'All Time'),
      datasets: [
        {
          label: 'Reports',
          data: data.map(d => d.reportCount),
          backgroundColor: 'rgba(13,110,253,0.7)',
          borderColor: 'rgba(13,110,253,1)',
          fill: false,
        },
        {
          label: 'Total Downtime (min)',
          data: data.map(d => d.totalDowntimeMinutes),
          backgroundColor: 'rgba(220,53,69,0.7)',
          borderColor: 'rgba(220,53,69,1)',
          fill: false,
        },
        {
          label: 'Incidents',
          data: data.map(d => d.totalIncidents),
          backgroundColor: 'rgba(255,193,7,0.8)',
          borderColor: 'rgba(255,193,7,1)',
          fill: false,
        },
      ],
    };
  });

  readonly chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
    },
  };

  readonly machineStatusConfig = [
    { key: 'RUNNING',     label: 'Running',     badgeClass: 'bg-success' },
    { key: 'STOPPED',     label: 'Stopped',     badgeClass: 'bg-danger' },
    { key: 'MAINTENANCE', label: 'Maintenance', badgeClass: 'bg-warning text-dark' },
    { key: 'READY',       label: 'Ready',       badgeClass: 'bg-primary' },
  ];

  ngOnInit(): void { this.loadSummary(); }

  loadSummary(): void {
    const v = this.form.getRawValue();
    let params = new HttpParams();
    if (v.fromDate)   params = params.set('fromDate',   v.fromDate);
    if (v.toDate)     params = params.set('toDate',     v.toDate);
    if (v.shiftId)    params = params.set('shiftId',    v.shiftId);
    if (v.staffEmail) params = params.set('staffEmail', v.staffEmail);
    if (v.groupBy)    params = params.set('groupBy',    v.groupBy);

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
