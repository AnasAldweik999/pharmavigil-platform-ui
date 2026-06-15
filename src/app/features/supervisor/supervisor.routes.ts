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
      { path: 'dashboard',  title: 'PharmaVigil · Dashboard',  component: SupervisorDashboardComponent },
      { path: 'users',      title: 'PharmaVigil · Users',      component: SupervisorUsersComponent },
      { path: 'machines',   title: 'PharmaVigil · Machines',   component: MachinesComponent },
      { path: 'stop-types', title: 'PharmaVigil · Stop Types', component: StopTypesComponent },
      { path: 'shifts',     title: 'PharmaVigil · Shifts',     component: ShiftsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
