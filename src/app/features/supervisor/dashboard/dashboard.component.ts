import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ReportsTabComponent } from './reports-tab/reports-tab.component';
import { SummaryTabComponent } from './summary-tab/summary-tab.component';
import { ProductsTabComponent } from './products-tab/products-tab.component';
import { SmartComparisonTabComponent } from './smart-comparison-tab/smart-comparison-tab.component';

type DashboardTab = 'reports' | 'summary' | 'products' | 'comparison';

@Component({
  selector: 'app-supervisor-dashboard',
  imports: [ReportsTabComponent, SummaryTabComponent, ProductsTabComponent, SmartComparisonTabComponent],
  templateUrl: './dashboard.component.html',
})
export class SupervisorDashboardComponent {
  readonly name      = inject(AuthService).currentName;
  readonly activeTab = signal<DashboardTab>('reports');

  readonly tabs: { key: DashboardTab; label: string }[] = [
    { key: 'reports',    label: 'Reports'          },
    { key: 'summary',    label: 'Summary & Charts' },
    { key: 'products',   label: 'Machines'         },
    { key: 'comparison', label: 'Smart Comparison' },
  ];
}
