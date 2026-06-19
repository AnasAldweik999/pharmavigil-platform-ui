import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { MachineStatus, WorkReportResponse } from '../../../../core/models/work-report.models';

@Component({
  selector: 'app-report-detail-modal',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './report-detail-modal.component.html',
})
export class ReportDetailModalComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('modal') private modalRef!: ElementRef<HTMLElement>;
  private bsModal: { show(): void; hide(): void } | null = null;

  readonly report = signal<WorkReportResponse | null>(null);

  readonly statusList: MachineStatus[] = ['RUNNING', 'STOPPED', 'MAINTENANCE', 'READY'];
  readonly statusConfig: Record<MachineStatus, { label: string; borderClass: string; bgClass: string }> = {
    RUNNING:     { label: 'Running',     borderClass: 'border-success', bgClass: 'bg-success' },
    STOPPED:     { label: 'Stopped',     borderClass: 'border-danger',  bgClass: 'bg-danger'  },
    MAINTENANCE: { label: 'Maintenance', borderClass: 'border-warning', bgClass: 'bg-warning' },
    READY:       { label: 'Ready',       borderClass: 'border-primary', bgClass: 'bg-primary' },
  };

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.modalRef?.nativeElement) return;
    this.modalRef.nativeElement.addEventListener('hidden.bs.modal', () => this.report.set(null));
  }

  open(r: WorkReportResponse): void {
    this.report.set(r);
    this.modal?.show();
  }

  close(): void { this.modal?.hide(); }

  statusCardClass(status: MachineStatus, cardStatus: MachineStatus): string {
    const cfg = this.statusConfig[cardStatus];
    return status === cardStatus
      ? `card p-2 text-center border-2 flex-fill ${cfg.borderClass} ${cfg.bgClass} bg-opacity-10`
      : 'card p-2 text-center border-2 flex-fill border-light-subtle bg-white opacity-50';
  }

  private get modal(): { show(): void; hide(): void } | null {
    if (!isPlatformBrowser(this.platformId) || !this.modalRef?.nativeElement) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BootstrapModal = (window as any).bootstrap?.Modal;
    if (!BootstrapModal) return null;
    if (!this.bsModal) {
      this.bsModal = new BootstrapModal(this.modalRef.nativeElement) as { show(): void; hide(): void };
    }
    return this.bsModal;
  }
}
