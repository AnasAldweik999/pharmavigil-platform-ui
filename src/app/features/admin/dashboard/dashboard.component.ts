import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.component.html',
})
export class AdminDashboardComponent {
  readonly email = inject(AuthService).currentEmail;
}
