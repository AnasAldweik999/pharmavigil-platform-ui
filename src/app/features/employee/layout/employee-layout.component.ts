import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-employee-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './employee-layout.component.html',
})
export class EmployeeLayoutComponent {
  private readonly authService = inject(AuthService);

  readonly email = this.authService.currentEmail;
  readonly sidebarOpen = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}
