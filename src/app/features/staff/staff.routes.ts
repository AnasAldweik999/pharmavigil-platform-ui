import { Routes } from '@angular/router';
import { StaffLayoutComponent } from './layout/staff-layout.component';
import { ReportListComponent } from './reports/list/report-list.component';
import { ReportCreateComponent } from './reports/create/report-create.component';

export const staffRoutes: Routes = [
  {
    path: '',
    component: StaffLayoutComponent,
    children: [
      { path: 'reports',     title: 'PharmaVigil · My Reports', component: ReportListComponent },
      { path: 'reports/new', title: 'PharmaVigil · New Report',  component: ReportCreateComponent },
      { path: '', redirectTo: 'reports', pathMatch: 'full' },
    ],
  },
];
