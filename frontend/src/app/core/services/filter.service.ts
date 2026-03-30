import { Injectable, signal } from '@angular/core';

export interface FilterState {
  searchQuery: string;
  sp: string;
  type: string;
  criticality: string;
  client: string;
  team: string;
  assignee: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  sp: '',
  type: '',
  criticality: '',
  client: '',
  team: '',
  assignee: '',
  dateFrom: '',
  dateTo: ''
};

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  public showCreateTaskModal = signal(false);

  public filters = signal<FilterState>(this.loadFilters());

  private loadFilters(): FilterState {
    try {
      const saved = localStorage.getItem('task_manager_filters');
      if (saved) {
        return { ...DEFAULT_FILTERS, ...JSON.parse(saved) };
      }
    } catch {
      // Ignored
    }
    return { ...DEFAULT_FILTERS };
  }

  private saveFilters(state: FilterState): void {
    try {
      localStorage.setItem('task_manager_filters', JSON.stringify(state));
    } catch {
      // Ignored
    }
  }

  public updateFilter(key: keyof FilterState, value: string): void {
    this.filters.update(current => {
      const newState = { ...current, [key]: value };
      this.saveFilters(newState);
      return newState;
    });
  }

  /**
   * @description Set both date range fields at once
   */
  public setDateRange(from: string, to: string): void {
    this.filters.update(current => {
      const newState = { ...current, dateFrom: from, dateTo: to };
      this.saveFilters(newState);
      return newState;
    });
  }

  /**
   * @description Clear the date range filter
   */
  public clearDateRange(): void {
    this.setDateRange('', '');
  }

  public resetFilters(): void {
    const newState = { ...DEFAULT_FILTERS };
    this.filters.set(newState);
    this.saveFilters(newState);
  }
}
