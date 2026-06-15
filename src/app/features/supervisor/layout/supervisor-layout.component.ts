import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-supervisor-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './supervisor-layout.component.html',
})
export class SupervisorLayoutComponent {
  private readonly authService = inject(AuthService);

  readonly name = this.authService.currentName;
  readonly email = this.authService.currentEmail;
  readonly initials = computed(() =>
    (this.name() ?? '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  );
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
