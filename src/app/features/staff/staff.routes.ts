import { Routes } from '@angular/router';
import { StaffHomeComponent } from './home/home.component';
import {StaffLayoutComponent} from './layout/staff-layout.component';

export const staffRoutes: Routes = [
  {
    path: '',
    component: StaffLayoutComponent,
    children: [
      { path: 'home', component: StaffHomeComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];
