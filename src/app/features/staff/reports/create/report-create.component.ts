import {
  Component,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { DecimalPipe, isPlatformBrowser, NgClass } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment.staff';
import { ToastService } from '../../../../core/services/toast.service';
import {
  CreateWorkReportRequest,
  MachineStatus,
  WorkReportResponse,
} from '../../../../core/models/work-report.models';
import { SearchableDropdownComponent } from '../../../../shared/searchable-dropdown/searchable-dropdown.component';

function outputUnitsValidator(ctrl: AbstractControl): ValidationErrors | null {
  const raw = ctrl.value;
  if (raw === null || raw === undefined || raw === '') return null;
  const str = String(raw).trim();
  if (!/^\d+$/.test(str)) return { invalidNumber: true };
  if (str.length > 15)    return { maxIntegerDigits: true };
  return null;
}

function qualityValidator(ctrl: AbstractControl): ValidationErrors | null {
  const deviation = ctrl.get('deviation')?.value as boolean;
  const deviationDetails = (ctrl.get('deviationDetails')?.value as string | null)?.trim();
  const hold = ctrl.get('hold')?.value as boolean;
  const holdDetails = (ctrl.get('holdDetails')?.value as string | null)?.trim();
  const errors: ValidationErrors = {};
  if (deviation && !deviationDetails) errors['deviationDetailsRequired'] = true;
  if (hold && !holdDetails) errors['holdDetailsRequired'] = true;
  return Object.keys(errors).length ? errors : null;
}

@Component({
  selector: 'app-report-create',
  imports: [ReactiveFormsModule, RouterLink, NgClass, SearchableDropdownComponent, DecimalPipe],
  templateUrl: './report-create.component.html',
})
export class ReportCreateComponent {
  private readonly fb           = inject(FormBuilder);
  private readonly http         = inject(HttpClient);
  private readonly router       = inject(Router);
  protected readonly base       = environment.apiUrl;
  private readonly platformId   = inject(PLATFORM_ID);
  private readonly toastService = inject(ToastService);

  @ViewChild('confirmModal') private confirmModalRef!: ElementRef<HTMLElement>;
  private bsConfirmModal: { show(): void; hide(): void } | null = null;

  readonly today          = new Date().toISOString().split('T')[0];
  readonly submitting     = signal(false);
  readonly submitted      = signal(false);
  readonly confirmPreview = signal<WorkReportResponse | null>(null);

  private shiftLabel                                                 = '';
  private readonly machineLabels  = new WeakMap<AbstractControl, string>();
  private readonly stopTypeLabels = new WeakMap<AbstractControl, string>();

  readonly shiftLabelFn    = (s: any) => s.name as string;
  readonly shiftValueFn    = (s: any) => s.id as string;
  readonly machineLabelFn  = (m: any) => m.name as string;
  readonly machineValueFn  = (m: any) => m.id as string;
  readonly stopTypeLabelFn = (st: any) => st.name as string;
  readonly stopTypeValueFn = (st: any) => st.id as string;

  readonly statusList: MachineStatus[] = ['RUNNING', 'STOPPED', 'MAINTENANCE', 'READY'];
  readonly statusConfig: Record<MachineStatus, { label: string; borderClass: string; bgClass: string }> = {
    RUNNING:     { label: 'Running',     borderClass: 'border-success', bgClass: 'bg-success' },
    STOPPED:     { label: 'Stopped',     borderClass: 'border-danger',  bgClass: 'bg-danger'  },
    MAINTENANCE: { label: 'Maintenance', borderClass: 'border-warning', bgClass: 'bg-warning' },
    READY:       { label: 'Ready',       borderClass: 'border-primary', bgClass: 'bg-primary' },
  };

  form = this.fb.group({
    reportDate: [this.today, Validators.required],
    shiftId:    ['', Validators.required],
    machines:   this.fb.array([this.buildMachineGroup()]),
  });

  private getConfirmModal(): { show(): void; hide(): void } | null {
    if (!isPlatformBrowser(this.platformId) || !this.confirmModalRef?.nativeElement) return null;
    if (!this.bsConfirmModal) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BootstrapModal = (window as any).bootstrap?.Modal;
      if (!BootstrapModal) return null;
      this.bsConfirmModal = new BootstrapModal(this.confirmModalRef.nativeElement) as { show(): void; hide(): void };
    }
    return this.bsConfirmModal;
  }

  // ── FormArray accessors ───────────────────────────────────────────────────

  get machinesArray(): FormArray { return this.form.get('machines') as FormArray; }

  getMachineGroup(mi: number): FormGroup {
    return this.machinesArray.at(mi) as FormGroup;
  }

  getProductsArray(mi: number): FormArray {
    return this.getMachineGroup(mi).get('products') as FormArray;
  }

  getProductGroup(mi: number, pi: number): FormGroup {
    return this.getProductsArray(mi).at(pi) as FormGroup;
  }

  getStopsArray(mi: number, pi: number): FormArray {
    return this.getProductGroup(mi, pi).get('stops') as FormArray;
  }

  getQualityGroup(mi: number, pi: number): FormGroup {
    return this.getProductGroup(mi, pi).get('quality') as FormGroup;
  }

  getIncidentsArray(mi: number): FormArray {
    return this.getMachineGroup(mi).get('incidents') as FormArray;
  }

  // ── Add / Remove ──────────────────────────────────────────────────────────

  addMachine(): void { this.machinesArray.push(this.buildMachineGroup()); }

  removeMachine(mi: number): void {
    if (this.machinesArray.length > 1) this.machinesArray.removeAt(mi);
  }

  setStatus(mi: number, status: MachineStatus): void {
    this.getMachineGroup(mi).get('status')!.setValue(status);
  }

  addProduct(mi: number): void {
    this.getProductsArray(mi).push(this.buildProductGroup());
  }

  removeProduct(mi: number, pi: number): void {
    if (this.getProductsArray(mi).length > 1) this.getProductsArray(mi).removeAt(pi);
  }

  addStop(mi: number, pi: number): void {
    this.getStopsArray(mi, pi).push(this.buildStopGroup());
  }

  removeStop(mi: number, pi: number, si: number): void {
    this.getStopsArray(mi, pi).removeAt(si);
  }

  addIncident(mi: number): void {
    this.getIncidentsArray(mi).push(this.buildIncidentGroup());
  }

  removeIncident(mi: number, ii: number): void {
    this.getIncidentsArray(mi).removeAt(ii);
  }

  // ── Label tracking for confirmation preview ───────────────────────────────

  onShiftLabelChange(label: string): void { this.shiftLabel = label; }
  onMachineLabelChange(mi: number, label: string): void {
    this.machineLabels.set(this.machinesArray.at(mi), label);
  }
  onStopTypeLabelChange(mi: number, pi: number, si: number, label: string): void {
    this.stopTypeLabels.set(this.getStopsArray(mi, pi).at(si), label);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Please fix all required fields before submitting.');
      return;
    }
    this.confirmPreview.set(this.buildPreview());
    this.getConfirmModal()?.show();
  }

  confirmSubmit(): void {
    this.getConfirmModal()?.hide();
    this.submitting.set(true);
    this.http.post(`${this.base}/api/staff/work-reports`, this.buildRequest()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/staff/reports']);
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }

  // ── Styling helpers ───────────────────────────────────────────────────────

  statusCardClass(currentStatus: string, cardStatus: MachineStatus): string {
    const cfg = this.statusConfig[cardStatus];
    return currentStatus === cardStatus
      ? `border border-2 ${cfg.borderClass} ${cfg.bgClass} bg-opacity-10`
      : 'border border-2 border-light-subtle bg-white opacity-50';
  }

  isInvalid(ctrl: AbstractControl | null): boolean {
    return !!ctrl && ctrl.invalid && (ctrl.touched || this.submitted());
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildMachineGroup(): FormGroup {
    return this.fb.group({
      machineId: ['', Validators.required],
      status:    ['RUNNING', Validators.required],
      products:  this.fb.array([this.buildProductGroup()]),
      incidents: this.fb.array([]),
    });
  }

  private buildProductGroup(): FormGroup {
    return this.fb.group({
      productName:  ['', Validators.required],
      batchNo:      ['', Validators.required],
      outputUnits:  ['', [Validators.required, outputUnitsValidator]],
      stops:        this.fb.array([]),
      quality:      this.buildQualityGroup(),
    });
  }

  private buildQualityGroup(): FormGroup {
    return this.fb.group({
      deviation:        [false],
      deviationDetails: [''],
      hold:             [false],
      holdDetails:      [''],
    }, { validators: qualityValidator });
  }

  private buildStopGroup(): FormGroup {
    return this.fb.group({
      stopTypeId: ['', Validators.required],
      duration:   [null, [Validators.required, Validators.min(1), Validators.max(9_999_999_999)]],
    });
  }

  private buildIncidentGroup(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required],
    });
  }

  private buildPreview(): WorkReportResponse {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = this.form.getRawValue() as any;
    return {
      id: '', shiftId: v.shiftId as string,
      shiftName:  this.shiftLabel,
      reportDate: v.reportDate as string,
      createdAt: '', updatedAt: '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      machines: (v.machines as any[]).map((m, mi) => ({
        id: '', machineId: m.machineId as string,
        machineName: this.machineLabels.get(this.machinesArray.at(mi)) ?? `Machine ${mi + 1}`,
        status: m.status as MachineStatus,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        products: (m.products as any[]).map((p, pi) => ({
          id: '',
          productName: p.productName as string,
          batchNo:     p.batchNo as string,
          outputUnits: Number(p.outputUnits),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stops: (p.stops as any[]).map((s, si) => ({
            id: '', stopTypeId: s.stopTypeId as string,
            stopTypeName: this.stopTypeLabels.get(this.getStopsArray(mi, pi).at(si)) ?? '—',
            duration: Number(s.duration),
          })),
          quality: {
            deviation:        !!p.quality.deviation,
            deviationDetails: p.quality.deviation ? (p.quality.deviationDetails as string || null) : null,
            hold:             !!p.quality.hold,
            holdDetails:      p.quality.hold ? (p.quality.holdDetails as string || null) : null,
          },
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        incidents: (m.incidents as any[]).map(i => ({ id: '', description: i.description as string })),
      })),
    };
  }

  private buildRequest(): CreateWorkReportRequest {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = this.form.getRawValue() as any;
    return {
      reportDate: v.reportDate as string,
      shiftId:    v.shiftId as string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      machines: v.machines.map((m: any) => ({
        machineId: m.machineId as string,
        status:    m.status as MachineStatus,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        products: m.products.map((p: any) => ({
          productName: p.productName as string,
          batchNo:     p.batchNo as string,
          outputUnits: Number(p.outputUnits),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stops: p.stops.map((s: any) => ({
            stopTypeId: s.stopTypeId as string,
            duration:   Number(s.duration),
          })),
          quality: {
            deviation:        !!p.quality.deviation,
            deviationDetails: p.quality.deviation ? (p.quality.deviationDetails as string) : null,
            hold:             !!p.quality.hold,
            holdDetails:      p.quality.hold ? (p.quality.holdDetails as string) : null,
          },
        })),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        incidents: m.incidents.map((i: any) => ({
          description: i.description as string,
        })),
      })),
    };
  }

}
