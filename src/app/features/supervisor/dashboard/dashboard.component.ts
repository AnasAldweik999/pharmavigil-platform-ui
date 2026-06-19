import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ReportsTabComponent } from './reports-tab/reports-tab.component';
import { SmartComparisonTabComponent } from './smart-comparison-tab/smart-comparison-tab.component';

type DashboardTab = 'reports' | 'comparison';

@Component({
  selector: 'app-supervisor-dashboard',
  imports: [ReportsTabComponent, SmartComparisonTabComponent],
  templateUrl: './dashboard.component.html',
})
export class SupervisorDashboardComponent {
  readonly name      = inject(AuthService).currentName;
  readonly activeTab = signal<DashboardTab>('comparison');

  readonly tabs: { key: DashboardTab; label: string }[] = [
    { key: 'comparison', label: 'Production Overview' },
    { key: 'reports',    label: 'Reports'            },
  ];
}
