import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import {supervisorGuard} from './core/guards/supervisor.guard';
import {staffGuard} from './core/guards/staff.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  {
    path: 'supervisor',
    canActivate: [authGuard, supervisorGuard],
    loadChildren: () =>
      import('./features/supervisor/supervisor.routes').then((m) => m.supervisorRoutes),
  },
  {
    path: 'staff',
    canActivate: [authGuard, staffGuard],
    loadChildren: () =>
      import('./features/staff/staff.routes').then((m) => m.staffRoutes),
  },
  { path: '**', redirectTo: '/login' },
];
