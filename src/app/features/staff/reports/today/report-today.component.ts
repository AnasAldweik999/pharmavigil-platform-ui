import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment.staff';
import { WorkReportResponse } from '../../../../core/models/work-report.models';
import { ReportDetailModalComponent } from '../detail/report-detail-modal.component';

@Component({
  selector: 'app-report-today',
  imports: [DatePipe, RouterLink, ReportDetailModalComponent],
  templateUrl: './report-today.component.html',
})
export class ReportTodayComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  @ViewChild('detailModal') detailModal!: ReportDetailModalComponent;

  readonly reports = signal<WorkReportResponse[]>([]);
  readonly loading = signal(false);
  readonly error   = signal(false);

  ngOnInit(): void { this.loadToday(); }

  loadToday(): void {
    this.loading.set(true);
    this.error.set(false);
    this.http.get<WorkReportResponse[]>(`${this.base}/api/staff/work-reports/today`).subscribe({
      next:  (list) => { this.reports.set(list); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  view(report: WorkReportResponse): void { this.detailModal.open(report); }
}
