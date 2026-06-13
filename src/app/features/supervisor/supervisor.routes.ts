import { Routes } from '@angular/router';
import { SupervisorLayoutComponent } from './layout/supervisor-layout.component';
import { SupervisorDashboardComponent } from './dashboard/dashboard.component';
import { SupervisorUsersComponent } from './users/users.component';
import { MachinesComponent } from './machines/machines.component';
import { StopTypesComponent } from './stop-types/stop-types.component';
import { ShiftsComponent } from './shifts/shifts.component';

export const supervisorRoutes: Routes = [
  {
    path: '',
    component: SupervisorLayoutComponent,
    children: [
      { path: 'dashboard',  component: SupervisorDashboardComponent },
      { path: 'users',      component: SupervisorUsersComponent },
      { path: 'machines',   component: MachinesComponent },
      { path: 'stop-types', component: StopTypesComponent },
      { path: 'shifts',     component: ShiftsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
