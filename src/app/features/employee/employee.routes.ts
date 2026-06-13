import { Routes } from '@angular/router';
import { EmployeeLayoutComponent } from './layout/employee-layout.component';
import { EmployeeHomeComponent } from './home/home.component';

export const employeeRoutes: Routes = [
  {
    path: '',
    component: EmployeeLayoutComponent,
    children: [
      { path: 'home', component: EmployeeHomeComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];
