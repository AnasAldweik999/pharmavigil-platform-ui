import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { GridColumn, GridAction, GridState } from '../../../../shared/grid/grid.models';
import { GridComponent } from '../../../../shared/grid/grid.component';
import { DateRangePickerComponent } from '../../../../shared/date-range-picker/date-range-picker.component';
import { MultiSelectComponent } from '../../../../shared/multi-select/multi-select.component';
import { ProductsInnerGridComponent } from './products-inner-grid/products-inner-grid.component';
import { IncidentsInnerGridComponent } from './incidents-inner-grid/incidents-inner-grid.component';
import { StopMachinesInnerGridComponent } from './stop-machines-inner-grid/stop-machines-inner-grid.component';
import { SmartComparisonService } from '../../../../core/services/smart-comparison.service';
import { environment } from '../../../../../environments/environment.staff';
import { AnyGroupRow, SmartGroupBy, StopGroupRow, SummaryCardsData } from '../../../../core/models/smart-comparison.models';

const today  = new Date().toLocaleDateString('en-CA');

const sharedMetricCols: GridColumn[] = [
  { key: 'productCount',   label: 'Products'       },
  { key: 'outputUnits',    label: 'Output Units'    },
  { key: 'stopCount',      label: 'Stops'           },
  { key: 'downtimeMinutes', label: 'Downtime (min)' },
  { key: 'incidentCount',  label: 'Incidents'       },
  { key: 'holdCount',      label: 'Holds'           },
  { key: 'deviationCount', label: 'Deviations'      },
];

@Component({
  selector: 'app-smart-comparison-tab',
  imports: [
    DecimalPipe,
    TitleCasePipe,
    GridComponent,
    DateRangePickerComponent,
    MultiSelectComponent,
    ProductsInnerGridComponent,
    IncidentsInnerGridComponent,
    StopMachinesInnerGridComponent,
  ],
  templateUrl: './smart-comparison-tab.component.html',
})
export class SmartComparisonTabComponent implements OnInit {
  private readonly service = inject(SmartComparisonService);
  protected readonly base  = environment.apiUrl;

  // ── Filter state ──────────────────────────────────────────────────────────
  readonly groupBy          = signal<SmartGroupBy>('MACHINE');
  readonly dateRange        = signal({ from: today, to: today });
  readonly selectedShifts   = signal<string[]>([]);
  readonly selectedStaff    = signal<string[]>([]);
  readonly selectedMachines = signal<string[]>([]);

  readonly groupByOptions: { value: SmartGroupBy; label: string }[] = [
    { value: 'MACHINE', label: 'Machine' },
    { value: 'STAFF',   label: 'Staff'   },
    { value: 'SHIFT',   label: 'Shift'   },
    { value: 'DATE',    label: 'Date'    },
    { value: 'STOP',    label: 'Stops'   },
  ];

  // ── Label / value fns for dropdowns ──────────────────────────────────────
  readonly shiftLabelFn  = (s: any) => s.name  as string;
  readonly shiftValueFn  = (s: any) => s.name  as string;
  readonly machLabelFn   = (m: any) => m.name  as string;
  readonly staffLabelFn  = (u: any) => u.name  as string;
  readonly staffEmailFn  = (u: any) => u.email as string;

  // ── Data state ────────────────────────────────────────────────────────────
  readonly summaryCards    = signal<SummaryCardsData | null>(null);
  readonly groupedDataLink = signal<string | null>(null);
  readonly groupedRows     = signal<AnyGroupRow[]>([]);
  readonly groupedTotal    = signal(0);
  readonly groupedPages    = signal(0);
  readonly loadingSummary  = signal(false);
  readonly loadingGrouped  = signal(false);
  readonly hasLoaded       = signal(false);
  readonly isStale         = signal(false);
  readonly appliedGroupBy  = signal<SmartGroupBy>('MACHINE');

  // ── Inner grid state ──────────────────────────────────────────────────────
  readonly activeProductsId   = signal<string | null>(null);
  readonly productsBaseUrl    = signal<string | null>(null);
  readonly productsTitle      = signal('');
  readonly activeIncidentsId  = signal<string | null>(null);
  readonly incidentsBaseUrl   = signal<string | null>(null);
  readonly incidentsTitle     = signal('');
  readonly activeStopId        = signal<string | null>(null);
  readonly stopMachinesBaseUrl = signal<string | null>(null);
  readonly stopMachinesTitle   = signal('');

  @ViewChild('productsRef')     productsRef?: ElementRef<HTMLElement>;
  @ViewChild('incidentsRef')    incidentsRef?: ElementRef<HTMLElement>;
  @ViewChild('stopMachinesRef') stopMachinesRef?: ElementRef<HTMLElement>;

  // ── Grid config ───────────────────────────────────────────────────────────
  readonly gridColumns = computed<GridColumn[]>(() => {
    switch (this.appliedGroupBy()) {
      case 'MACHINE': return [{ key: 'machineName', label: 'Machine' }, ...sharedMetricCols];
      case 'STAFF':   return [{ key: 'staffName', label: 'Staff Name' }, { key: 'staffEmail', label: 'Email', hidden: true }, ...sharedMetricCols];
      case 'SHIFT':   return [{ key: 'shiftName', label: 'Shift' }, ...sharedMetricCols];
      case 'DATE':    return [{ key: 'date', label: 'Date', type: 'date-only' as const }, ...sharedMetricCols];
      case 'STOP':    return [
        { key: 'stopName',             label: 'Stop'           },
        { key: 'totalMachines',        label: 'Machines'       },
        { key: 'totalProducts',        label: 'Products'       },
        { key: 'totalDowntimeMinutes', label: 'Downtime (min)' },
      ];
    }
  });

  readonly gridActions = computed<GridAction[]>(() => {
    if (this.appliedGroupBy() === 'STOP') {
      return [
        { key: 'machines', label: 'Machines', icon: 'machines', btnClass: 'btn-sm btn-outline-primary' },
      ];
    }
    return [
      { key: 'products',  label: 'Products',  icon: 'products',  btnClass: 'btn-sm btn-outline-primary' },
      { key: 'incidents', label: 'Incidents', icon: 'incidents', btnClass: 'btn-sm btn-outline-danger',
        condition: (row: any) => row.hasIncidents },
    ];
  });

  ngOnInit(): void {
    this.applyFilters();
  }

  private markStale(): void {
    if (this.hasLoaded()) {
      this.isStale.set(true);
    }
  }

  onGroupByChange(value: SmartGroupBy): void {
    this.groupBy.set(value);
    this.markStale();
  }

  onDateRangeChange(range: { from: string; to: string }): void {
    this.dateRange.set(range);
    this.markStale();
  }

  onShiftsChange(values: string[]): void {
    this.selectedShifts.set(values);
    this.markStale();
  }

  onStaffChange(values: string[]): void {
    this.selectedStaff.set(values);
    this.markStale();
  }

  onMachinesChange(values: string[]): void {
    this.selectedMachines.set(values);
    this.markStale();
  }

  applyFilters(): void {
    this.isStale.set(false);
    this.appliedGroupBy.set(this.groupBy());
    this.closeInnerGrids();
    this.loadingSummary.set(true);
    const f = {
      groupBy:      this.groupBy(),
      startDate:    this.dateRange().from,
      endDate:      this.dateRange().to,
      shifts:       this.selectedShifts().length   ? this.selectedShifts()   : undefined,
      staffEmails:  this.selectedStaff().length    ? this.selectedStaff()    : undefined,
      machineNames: this.selectedMachines().length ? this.selectedMachines() : undefined,
    };

    this.service.getSummary(f).subscribe({
      next: res => {
        this.summaryCards.set(res.summaryCards);
        this.groupedDataLink.set(res.groupedDataLink);
        this.hasLoaded.set(true);
        this.loadGrouped(0);
      },
      error: () => {
        this.loadingSummary.set(false);
      },
    });
  }

  onPageChange(state: GridState): void {
    const link = this.groupedDataLink();
    if (!link) return;
    this.loadGrouped(state.page, state.size);
  }

  onActionClick(event: { action: GridAction; row: unknown }): void {
    const r     = event.row as any;
    const id    = this.getRowId(r);
    const title = this.getRowTitle(r);

    if (event.action.key === 'products') {
      if (this.activeProductsId() === id) {
        this.activeProductsId.set(null);
        this.productsBaseUrl.set(null);
      } else {
        this.activeProductsId.set(id);
        this.productsBaseUrl.set(r._links?.['products'] ?? null);
        this.productsTitle.set(title);
        afterNextRender(() => {
          this.productsRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    } else if (event.action.key === 'incidents') {
      if (this.activeIncidentsId() === id) {
        this.activeIncidentsId.set(null);
        this.incidentsBaseUrl.set(null);
      } else {
        this.activeIncidentsId.set(id);
        this.incidentsBaseUrl.set(r._links?.['incidents'] ?? null);
        this.incidentsTitle.set(title);
        afterNextRender(() => {
          this.incidentsRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    } else if (event.action.key === 'machines') {
      if (this.activeStopId() === id) {
        this.activeStopId.set(null);
        this.stopMachinesBaseUrl.set(null);
      } else {
        this.activeStopId.set(id);
        this.stopMachinesBaseUrl.set(r._links?.['machines'] ?? null);
        this.stopMachinesTitle.set(title);
        afterNextRender(() => {
          this.stopMachinesRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }
  }

  kpiFontSize(value: number): string {
    const digits = Math.abs(value) >= 1 ? Math.floor(Math.log10(Math.abs(value))) + 1 : 1;
    if (digits <= 6)  return 'clamp(1.3rem, 3vw, 2rem)';
    if (digits <= 9)  return 'clamp(1rem, 2.5vw, 1.5rem)';
    if (digits <= 12) return 'clamp(0.8rem, 2vw, 1.1rem)';
    return 'clamp(0.7rem, 1.5vw, 0.9rem)';
  }

  private loadGrouped(page: number, size = 10): void {
    const link = this.groupedDataLink();
    if (!link) return;
    this.loadingGrouped.set(true);
    this.service.getGrouped(link, page, size).subscribe({
      next: res => {
        this.groupedRows.set(res.content);
        this.groupedTotal.set(res.totalElements);
        this.groupedPages.set(res.totalPages);
        this.loadingSummary.set(false);
        this.loadingGrouped.set(false);
      },
      error: () => {
        this.loadingSummary.set(false);
        this.loadingGrouped.set(false);
      },
    });
  }

  clearResults(): void {
    this.isStale.set(false);
    this.summaryCards.set(null);
    this.groupedRows.set([]);
    this.groupedTotal.set(0);
    this.groupedPages.set(0);
    this.hasLoaded.set(false);
    this.closeInnerGrids();
  }

  private closeInnerGrids(): void {
    this.activeProductsId.set(null);
    this.productsBaseUrl.set(null);
    this.activeIncidentsId.set(null);
    this.incidentsBaseUrl.set(null);
    this.activeStopId.set(null);
    this.stopMachinesBaseUrl.set(null);
  }

  private getRowId(row: any): string {
    switch (this.appliedGroupBy()) {
      case 'MACHINE': return row.machineName ?? '';
      case 'STAFF':   return row.staffEmail  ?? '';
      case 'SHIFT':   return row.shiftName   ?? '';
      case 'DATE':    return row.date        ?? '';
      case 'STOP':    return row.stopName    ?? '';
    }
  }

  private getRowTitle(row: any): string {
    switch (this.appliedGroupBy()) {
      case 'MACHINE': return row.machineName ?? '';
      case 'STAFF':   return row.staffName   ?? row.staffEmail ?? '';
      case 'SHIFT':   return row.shiftName   ?? '';
      case 'DATE':    return row.date        ?? '';
      case 'STOP':    return row.stopName    ?? '';
    }
  }
}
