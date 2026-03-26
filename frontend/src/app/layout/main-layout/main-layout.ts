/**
 * @description Main layout component with sidebar, navbar, and router outlet
 * @author Anjana E
 * @date 24-03-2026
 */
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { ActionBarComponent } from '../../shared/components/action-bar/action-bar';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ActionBarComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'closeDropdowns($event)',
  },
})
export class MainLayoutComponent {
  protected authService = inject(AuthService);
  protected themeService = inject(ThemeService);
  protected toastService = inject(ToastService);

  protected sidebarCollapsed = signal(true);
  protected showProfileDropdown = signal(false);

  /**
   * @description Toggle sidebar collapsed state
   */
  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  getUserInitials(): string {
    const user = this.authService.currentUser();
    if (!user) return '?';
    return user.username.charAt(0).toUpperCase();
  }

  /**
   * @description Toggle profile dropdown
   */
  toggleProfileDropdown(event: Event): void {
    event.stopPropagation();
    this.showProfileDropdown.update((v) => !v);
  }

  /**
   * @description Handle clicks outside the sidebar or dropdown to close them
   */
  closeDropdowns(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Close sidebar if clicking outside of it
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && !sidebar.contains(target) && !this.sidebarCollapsed()) {
      // Don't close if clicking the toggle button in navbar
      const toggleBtn = document.querySelector('.navbar .sidebar__toggle');
      if (!toggleBtn?.contains(target)) {
        this.sidebarCollapsed.set(true);
      }
    }

    // Close profile dropdown if clicking outside
    const userProfile = document.querySelector('.navbar__user');
    if (userProfile && !userProfile.contains(target)) {
      this.showProfileDropdown.set(false);
    }
  }
}

