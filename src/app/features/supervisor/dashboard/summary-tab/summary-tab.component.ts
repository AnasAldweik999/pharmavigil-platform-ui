import { Component, computed, effect, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, ChartType as ChartJsType } from 'chart.js';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { environment } from '../../../../../environments/environment';
import { toSignal } from '@angular/core/rxjs-interop';
import { DashboardSummaryResponse, SummaryGroupBy } from '../../../../core/models/supervisor.models';
import { DateRangePickerComponent } from '../../../../shared/date-range-picker/date-range-picker.component';
import { SearchableDropdownComponent } from '../../../../shared/searchable-dropdown/searchable-dropdown.component';

type MetricKey = 'outputUnits' | 'products' | 'stops' | 'downtime' | 'incidents';

@Component({
  selector: 'app-summary-tab',
  imports: [ReactiveFormsModule, BaseChartDirective, NgxEchartsDirective, DateRangePickerComponent, SearchableDropdownComponent],
  templateUrl: './summary-tab.component.html',
})
export class SummaryTabComponent implements OnInit {
  private readonly http  = inject(HttpClient);
  private readonly fb    = inject(FormBuilder);
  protected readonly base = environment.apiUrl;
  readonly isBrowser      = isPlatformBrowser(inject(PLATFORM_ID));

  readonly form = this.fb.nonNullable.group({
    fromDate:    [new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-CA')],
    toDate:      [new Date().toLocaleDateString('en-CA')],
    shiftId:     [''],
    staffEmail:  [''],
    machineName: [''],
    groupBy:     ['' as SummaryGroupBy | ''],
  });

  readonly shiftLabelFn   = (s: any) => s.name as string;
  readonly shiftValueFn   = (s: any) => s.id   as string;
  readonly machLabelFn    = (m: any) => m.name as string;
  readonly staffLabelFn   = (u: any) => u.name as string;
  readonly staffEmailFn   = (u: any) => u.email as string;

  readonly summaryData        = signal<DashboardSummaryResponse[]>([]);
  readonly loading            = signal(false);
  readonly selectedChartType  = signal<ChartJsType>('bar');
  readonly logScale           = signal(false);
  readonly selectedMetrics    = signal<MetricKey[]>(['outputUnits']);

  readonly chartTypeOptions: ChartJsType[] = ['bar', 'line', 'pie'];

  readonly metricOptions: { key: MetricKey; label: string; bg: string; border: string }[] = [
    { key: 'outputUnits', label: 'Output Units',  bg: 'rgba(25,135,84,0.7)',   border: 'rgba(25,135,84,1)'   },
    { key: 'products',    label: 'Products',       bg: 'rgba(13,110,253,0.7)',  border: 'rgba(13,110,253,1)'  },
    { key: 'stops',       label: 'Stops',          bg: 'rgba(255,193,7,0.85)', border: 'rgba(255,193,7,1)'   },
    { key: 'downtime',    label: 'Downtime (min)', bg: 'rgba(220,53,69,0.7)',   border: 'rgba(220,53,69,1)'   },
    { key: 'incidents',   label: 'Incidents',      bg: 'rgba(111,66,193,0.75)',border: 'rgba(111,66,193,1)'  },
  ];

  readonly groupByOptions: { label: string; value: SummaryGroupBy }[] = [
    { label: 'By Date',    value: 'DATE'    },
    { label: 'By Shift',   value: 'SHIFT'   },
    { label: 'By User',    value: 'USER'    },
    { label: 'By Machine', value: 'MACHINE' },
  ];

  private readonly formValues = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly availableGroupByOptions = computed(() => {
    const v = this.formValues();
    return this.groupByOptions.filter(opt => {
      if (opt.value === 'SHIFT'   && v.shiftId)     return false;
      if (opt.value === 'MACHINE' && v.machineName)  return false;
      if (opt.value === 'USER'    && v.staffEmail)   return false;
      return true;
    });
  });

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

  // ── Chart.js (bar / line) ────────────────────────────────────────────────

  readonly chartData = computed<ChartData>(() => {
    const data = this.summaryData();
    if (!data.length) return { labels: [], datasets: [] };
    const metrics = this.selectedMetrics();
    return {
      labels: data.map(d => {
        const label = String(d.group || 'All');
        return label.length > 16 ? label.slice(0, 15) + '…' : label;
      }),
      datasets: metrics.map(key => {
        const opt = this.metricOptions.find(m => m.key === key)!;
        return {
          label: opt.label,
          data: data.map(d => this.metricValue(d, key)),
          backgroundColor: opt.bg,
          borderColor: opt.border,
          fill: false,
          maxBarThickness: 80,
        };
      }),
    };
  });

  readonly chartOptions = computed<ChartOptions>(() => {
    const count = this.summaryData().length;
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxRotation: count > 6 ? 45 : 0,
            minRotation: count > 6 ? 45 : 0,
          },
        },
        y: this.logScale()
          ? { type: 'logarithmic', min: 0.5, grid: { color: 'rgba(0,0,0,0.05)' } }
          : { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      },
    };
  });

  // ── ECharts (pie) ────────────────────────────────────────────────────────

  private readonly echartsColors = [
    '#4361ee', '#3a0ca3', '#7209b7', '#f72585',
    '#4cc9f0', '#2dc653', '#fbbf24', '#ef4444',
    '#06b6d4', '#f97316', '#a3e635', '#e879f9',
  ];

  readonly echartsOptionMap = computed<Record<MetricKey, EChartsOption>>(() => {
    const data = this.summaryData();
    const metrics = this.selectedMetrics();
    const multiMetric = metrics.length > 1;
    const labels = data.map(d => {
      const l = String(d.group || 'All');
      return l.length > 20 ? l.slice(0, 19) + '…' : l;
    });

    const result = {} as Record<MetricKey, EChartsOption>;
    for (const m of this.metricOptions) {
      const isSelected = metrics.includes(m.key);
      result[m.key] = {
        color: this.echartsColors,
        ...(multiMetric && isSelected ? {
          title: {
            text: m.label,
            left: 'center',
            top: 6,
            textStyle: { fontSize: 12, fontWeight: 600, color: '#374151', fontFamily: 'inherit' },
          },
        } : {}),
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
        },
        legend: { show: false },
        series: [{
          type: 'pie',
          radius: '60%',
          center: multiMetric && isSelected ? ['50%', '56%'] : ['50%', '52%'],
          label: {
            position: 'outside',
            formatter: '{b}\n{d}%',
            fontSize: 11,
            color: '#444',
            lineHeight: 16,
          },
          labelLine: {
            show: true,
            length: 12,
            length2: 10,
            smooth: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 8,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0,0,0,0.12)',
            },
          },
          data: data.map((d, i) => ({ name: labels[i], value: this.metricValue(d, m.key) })),
        }],
      };
    }
    return result;
  });

  private metricValue(d: DashboardSummaryResponse, key: MetricKey): number {
    switch (key) {
      case 'outputUnits': return d.totalOutputUnits;
      case 'products':    return d.totalProducts;
      case 'stops':       return d.totalStops;
      case 'downtime':    return d.totalDowntimeMinutes;
      case 'incidents':   return d.totalIncidents;
    }
  }

  onDateRangeChange(range: { from: string; to: string }): void {
    this.form.patchValue({ fromDate: range.from, toDate: range.to });
  }

  toggleMetric(key: MetricKey): void {
    const current = this.selectedMetrics();
    if (current.includes(key)) {
      if (current.length === 1) return;
      this.selectedMetrics.set(current.filter(k => k !== key));
    } else {
      this.selectedMetrics.set([...current, key]);
    }
  }

  setChartType(type: ChartJsType): void {
    this.selectedChartType.set(type);
    if (type === 'pie') this.logScale.set(false);
  }

  constructor() {
    effect(() => {
      const current = this.form.getRawValue().groupBy;
      const available = this.availableGroupByOptions();
      if (current && !available.some(o => o.value === current)) {
        this.form.get('groupBy')!.setValue('');
      }
    });
  }

  ngOnInit(): void {
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
