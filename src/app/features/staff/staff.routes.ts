import { Routes } from '@angular/router';
import { StaffLayoutComponent } from './layout/staff-layout.component';
import { ReportListComponent } from './reports/list/report-list.component';
import { ReportCreateComponent } from './reports/create/report-create.component';

export const staffRoutes: Routes = [
  {
    path: '',
    component: StaffLayoutComponent,
    children: [
      { path: 'reports',     component: ReportListComponent },
      { path: 'reports/new', component: ReportCreateComponent },
      { path: '', redirectTo: 'reports', pathMatch: 'full' },
    ],
  },
];
