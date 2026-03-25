import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { FilterService, FilterState } from '../../../core/services/filter.service';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

@Component({
  selector: 'app-action-bar',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './action-bar.html',
  styleUrl: './action-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionBarComponent {
  protected filterService = inject(FilterService);
  private router = inject(Router);

  // Reaction to URL changes for dynamic title
  private url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  protected pageTitle = computed(() => {
    const currentUrl = this.url();
    if (currentUrl.includes('/board')) return 'Kanban Board';
    if (currentUrl.includes('/tasks')) return 'My Tasks';
    return 'Developments';
  });

  onSearchChange(value: string): void {
    this.filterService.updateFilter('searchQuery', value);
  }

  onFilterChange(key: keyof FilterState, value: string): void {
    this.filterService.updateFilter(key, value);
  }

  openCreateModal(): void {
    this.filterService.showCreateTaskModal.set(true);
  }
}

