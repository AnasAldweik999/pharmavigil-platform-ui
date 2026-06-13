import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-supervisor-dashboard',
  templateUrl: './dashboard.component.html',
})
export class SupervisorDashboardComponent {
  readonly name = inject(AuthService).currentName;
}
