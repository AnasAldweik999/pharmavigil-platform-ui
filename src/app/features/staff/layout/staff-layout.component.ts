import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastContainerComponent } from '../../../shared/toast/toast-container.component';

@Component({
  selector: 'app-staff-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent],
  templateUrl: './staff-layout.component.html',
})
export class StaffLayoutComponent {
  private readonly authService = inject(AuthService);

  readonly name = this.authService.currentName;
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
