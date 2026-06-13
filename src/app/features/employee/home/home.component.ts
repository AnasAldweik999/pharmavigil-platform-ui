import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-employee-home',
  templateUrl: './home.component.html',
})
export class EmployeeHomeComponent {
  readonly email = inject(AuthService).currentEmail;
}
