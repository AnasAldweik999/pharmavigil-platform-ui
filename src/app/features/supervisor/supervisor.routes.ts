import { Routes } from '@angular/router';
import { SupervisorLayoutComponent } from './layout/supervisor-layout.component';
import { SupervisorDashboardComponent } from './dashboard/dashboard.component';
import { SupervisorUsersComponent } from './users/users.component';

export const supervisorRoutes: Routes = [
  {
    path: '',
    component: SupervisorLayoutComponent,
    children: [
      { path: 'dashboard', component: SupervisorDashboardComponent },
      { path: 'users', component: SupervisorUsersComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
