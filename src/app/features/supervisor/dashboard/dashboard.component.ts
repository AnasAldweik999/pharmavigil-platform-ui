import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { Page } from '../../../core/models/user.models';
import { ShiftItem } from '../../../core/models/catalog.models';
import { ReportsTabComponent } from './reports-tab/reports-tab.component';
import { SummaryTabComponent } from './summary-tab/summary-tab.component';
import { ProductsTabComponent } from './products-tab/products-tab.component';

type DashboardTab = 'reports' | 'summary' | 'products';

@Component({
  selector: 'app-supervisor-dashboard',
  imports: [ReportsTabComponent, SummaryTabComponent, ProductsTabComponent],
  templateUrl: './dashboard.component.html',
})
export class SupervisorDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  readonly name         = inject(AuthService).currentName;

  readonly activeTab     = signal<DashboardTab>('reports');
  readonly shifts        = signal<ShiftItem[]>([]);
  readonly shiftsLoading = signal(true);

  readonly tabs: { key: DashboardTab; label: string }[] = [
    { key: 'reports',  label: 'Reports' },
    { key: 'summary',  label: 'Summary & Charts' },
    { key: 'products', label: 'Products' },
  ];

  ngOnInit(): void {
    this.http.get<Page<ShiftItem>>(`${this.base}/api/supervisor/shifts?size=1000&sort=name,asc`).subscribe({
      next: (page) => {
        this.shifts.set(page.content);
        this.shiftsLoading.set(false);
      },
      error: () => this.shiftsLoading.set(false),
    });
  }
}
