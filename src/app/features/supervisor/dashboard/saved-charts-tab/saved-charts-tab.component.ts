import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  Input,
  OnInit,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, ChartType as ChartJsType } from 'chart.js';
import { environment } from '../../../../../environments/environment';
import { Page } from '../../../../core/models/user.models';
import { ShiftItem } from '../../../../core/models/catalog.models';
import {
  ChartMetric,
  CreateSavedChartRequest,
  DashboardSummaryResponse,
  SavedChartResponse,
  SavedChartType,
  SummaryGroupBy,
} from '../../../../core/models/supervisor.models';

const CHART_METRIC_LABELS: Record<ChartMetric, string> = {
  REPORT_COUNT:    'Report Count',
  TOTAL_DOWNTIME:  'Total Downtime (min)',
  AVG_DOWNTIME:    'Avg Downtime (min)',
  TOTAL_INCIDENTS: 'Total Incidents',
  MACHINE_COUNTS:  'Machine Counts',
};

const MACHINE_COLORS: Record<string, string> = {
  RUNNING:     'rgba(25,135,84,0.8)',
  STOPPED:     'rgba(220,53,69,0.8)',
  MAINTENANCE: 'rgba(255,193,7,0.8)',
  READY:       'rgba(13,110,253,0.8)',
};

const DATASET_COLORS = [
  'rgba(13,110,253,0.75)',
  'rgba(220,53,69,0.75)',
  'rgba(255,193,7,0.85)',
  'rgba(25,135,84,0.75)',
  'rgba(111,66,193,0.75)',
];

@Component({
  selector: 'app-saved-charts-tab',
  imports: [ReactiveFormsModule, BaseChartDirective],
  templateUrl: './saved-charts-tab.component.html',
})
export class SavedChartsTabComponent implements OnInit, AfterViewInit {
  private readonly http       = inject(HttpClient);
  private readonly fb         = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base       = environment.apiUrl;

  readonly isBrowser = isPlatformBrowser(this.platformId);

  @Input() shifts: ShiftItem[] = [];

  @ViewChild('createModal') private createModalRef!: ElementRef<HTMLElement>;
  @ViewChild('deleteModal') private deleteModalRef!: ElementRef<HTMLElement>;
  private bsCreateModal: { show(): void; hide(): void } | null = null;
  private bsDeleteModal: { show(): void; hide(): void } | null = null;

  readonly charts         = signal<SavedChartResponse[]>([]);
  readonly loadedData     = signal<Record<string, DashboardSummaryResponse[]>>({});
  readonly loadingId      = signal<string | null>(null);
  readonly deletingId     = signal<string | null>(null);
  readonly listLoading    = signal(false);
  readonly submitting     = signal(false);
  readonly createError    = signal('');
  readonly chartToDelete  = signal<SavedChartResponse | null>(null);
  readonly logScales      = signal<Record<string, boolean>>({});

  readonly METRICS: { key: ChartMetric; label: string }[] = [
    { key: 'REPORT_COUNT',    label: 'Report Count' },
    { key: 'TOTAL_DOWNTIME',  label: 'Total Downtime' },
    { key: 'AVG_DOWNTIME',    label: 'Avg Downtime' },
    { key: 'TOTAL_INCIDENTS', label: 'Total Incidents' },
    { key: 'MACHINE_COUNTS',  label: 'Machine Counts' },
  ];

  readonly chartTypeOptions: { label: string; value: SavedChartType }[] = [
    { label: 'Bar',  value: 'BAR' },
    { label: 'Line', value: 'LINE' },
    { label: 'Pie',  value: 'PIE' },
  ];

  readonly groupByOptions: { label: string; value: SummaryGroupBy | '' }[] = [
    { label: 'None', value: '' },
    { label: 'By Date',  value: 'DATE' },
    { label: 'By Shift', value: 'SHIFT' },
    { label: 'By User',  value: 'USER' },
  ];

  readonly form = this.fb.nonNullable.group({
    name:       ['', Validators.required],
    chartType:  ['BAR' as SavedChartType, Validators.required],
    fromDate:   [''],
    toDate:     [''],
    shiftId:    [''],
    staffEmail: [''],
    groupBy:    ['' as SummaryGroupBy | ''],
    metrics:    this.fb.array(this.METRICS.map(() => new FormControl(false))),
  });

  get metricsArray(): FormArray { return this.form.get('metrics') as FormArray; }
  get nameControl()  { return this.form.controls.name; }

  ngOnInit(): void { this.loadCharts(); }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    if (this.createModalRef?.nativeElement) {
      this.createModalRef.nativeElement.addEventListener('hidden.bs.modal', () => {
        this.form.reset({ name: '', chartType: 'BAR', fromDate: '', toDate: '', shiftId: '', staffEmail: '', groupBy: '' });
        this.metricsArray.controls.forEach(c => c.setValue(false));
        this.createError.set('');
      });
    }
    if (this.deleteModalRef?.nativeElement) {
      this.deleteModalRef.nativeElement.addEventListener('hidden.bs.modal', () => {
        this.chartToDelete.set(null);
      });
    }
  }

  loadCharts(): void {
    this.listLoading.set(true);
    this.http.get<Page<SavedChartResponse>>(`${this.base}/api/supervisor/charts?size=1000`).subscribe({
      next: (page) => {
        this.charts.set(page.content);
        this.listLoading.set(false);
        page.content.forEach(chart => this.loadChartData(chart));
      },
      error: () => this.listLoading.set(false),
    });
  }

  openCreateModal(): void { this.createModal?.show(); }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const selectedMetrics = this.METRICS
      .filter((_, i) => this.metricsArray.at(i).value as boolean)
      .map(m => m.key);
    if (!selectedMetrics.length) {
      this.createError.set('Select at least one metric.');
      return;
    }

    const v = this.form.getRawValue();
    const body: CreateSavedChartRequest = {
      name:      v.name,
      chartType: v.chartType,
      metrics:   selectedMetrics,
      ...(v.fromDate   ? { fromDate:   v.fromDate }   : {}),
      ...(v.toDate     ? { toDate:     v.toDate }     : {}),
      ...(v.shiftId    ? { shiftId:    v.shiftId }    : {}),
      ...(v.staffEmail ? { staffEmail: v.staffEmail } : {}),
      ...(v.groupBy    ? { groupBy:    v.groupBy as SummaryGroupBy } : {}),
    };

    this.submitting.set(true);
    this.createError.set('');
    this.http.post<SavedChartResponse>(`${this.base}/api/supervisor/charts`, body).subscribe({
      next: (chart) => {
        this.submitting.set(false);
        this.createModal?.hide();
        this.charts.update(list => [chart, ...list]);
        this.loadChartData(chart);
      },
      error: (err) => {
        this.submitting.set(false);
        this.createError.set(err.error?.message ?? 'Failed to save chart.');
      },
    });
  }

  loadChartData(chart: SavedChartResponse): void {
    this.loadingId.set(chart.id);
    this.http.get<DashboardSummaryResponse[]>(`${this.base}/api/supervisor/charts/${chart.id}/data`).subscribe({
      next: (data) => {
        this.loadedData.update(m => ({ ...m, [chart.id]: data }));
        this.loadingId.set(null);
      },
      error: () => this.loadingId.set(null),
    });
  }

  deleteChart(chart: SavedChartResponse): void {
    this.chartToDelete.set(chart);
    this.deleteModal?.show();
  }

  confirmDelete(): void {
    const chart = this.chartToDelete();
    if (!chart) return;
    this.deletingId.set(chart.id);
    this.http.delete(`${this.base}/api/supervisor/charts/${chart.id}`).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.deleteModal?.hide();
        this.charts.update(list => list.filter(c => c.id !== chart.id));
        this.loadedData.update(m => { const n = { ...m }; delete n[chart.id]; return n; });
      },
      error: () => this.deletingId.set(null),
    });
  }

  chartTypeBadgeClass(type: SavedChartType): string {
    return type === 'PIE' ? 'bg-info text-dark' : type === 'LINE' ? 'bg-success' : 'bg-primary';
  }

  buildChartData(chart: SavedChartResponse, data: DashboardSummaryResponse[]): ChartData {
    if (!data.length) return { labels: [], datasets: [] };

    const labels = data.length === 1 && !chart.groupBy ? ['Total'] : data.map(d => d.group);
    const metricField: Record<ChartMetric, keyof DashboardSummaryResponse> = {
      REPORT_COUNT:    'reportCount',
      TOTAL_DOWNTIME:  'totalDowntimeMinutes',
      AVG_DOWNTIME:    'avgDowntimeMinutes',
      TOTAL_INCIDENTS: 'totalIncidents',
      MACHINE_COUNTS:  'machineCounts',
    };

    const datasets: ChartData['datasets'] = [];
    chart.metrics.forEach((metric, idx) => {
      if (metric === 'MACHINE_COUNTS') {
        const statuses = ['RUNNING', 'STOPPED', 'MAINTENANCE', 'READY'];
        statuses.forEach(status => {
          datasets.push({
            label: status.charAt(0) + status.slice(1).toLowerCase(),
            data: data.map(d => (d.machineCounts[status] ?? 0)),
            backgroundColor: MACHINE_COLORS[status],
          });
        });
      } else {
        datasets.push({
          label: CHART_METRIC_LABELS[metric],
          data: data.map(d => d[metricField[metric]] as number),
          backgroundColor: DATASET_COLORS[idx % DATASET_COLORS.length],
          borderColor: DATASET_COLORS[idx % DATASET_COLORS.length].replace('0.75', '1'),
          fill: false,
        });
      }
    });

    return { labels, datasets };
  }

  toChartJsType(type: SavedChartType): ChartJsType {
    if (type === 'PIE')  return 'pie';
    if (type === 'LINE') return 'line';
    return 'bar';
  }

  toggleLogScale(chartId: string): void {
    this.logScales.update(m => ({ ...m, [chartId]: !m[chartId] }));
  }

  buildChartOptions(chartId: string, chartType: SavedChartType): ChartOptions {
    const useLog = !!this.logScales()[chartId];
    const isRadial = chartType === 'PIE';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      ...(isRadial ? {} : {
        scales: {
          x: { grid: { display: false } },
          y: useLog
            ? { type: 'logarithmic', min: 0.5, grid: { color: 'rgba(0,0,0,0.05)' } }
            : { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        },
      }),
    };
  }

  private get createModal(): { show(): void; hide(): void } | null {
    if (!this.isBrowser || !this.createModalRef?.nativeElement) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BootstrapModal = (window as any).bootstrap?.Modal;
    if (!BootstrapModal) return null;
    if (!this.bsCreateModal) {
      this.bsCreateModal = new BootstrapModal(this.createModalRef.nativeElement) as { show(): void; hide(): void };
    }
    return this.bsCreateModal;
  }

  private get deleteModal(): { show(): void; hide(): void } | null {
    if (!this.isBrowser || !this.deleteModalRef?.nativeElement) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BootstrapModal = (window as any).bootstrap?.Modal;
    if (!BootstrapModal) return null;
    if (!this.bsDeleteModal) {
      this.bsDeleteModal = new BootstrapModal(this.deleteModalRef.nativeElement) as { show(): void; hide(): void };
    }
    return this.bsDeleteModal;
  }
}
