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

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  public showCreateTaskModal = signal(false);

  public filters = signal<FilterState>({
    searchQuery: '',
    sp: '',
    type: '',
    criticality: '',
    client: '',
    team: '',
    assignee: '',
    dateFrom: '',
    dateTo: ''
  });

  public updateFilter(key: keyof FilterState, value: string): void {
    this.filters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  /**
   * @description Set both date range fields at once
   */
  public setDateRange(from: string, to: string): void {
    this.filters.update(current => ({
      ...current,
      dateFrom: from,
      dateTo: to
    }));
  }

  /**
   * @description Clear the date range filter
   */
  public clearDateRange(): void {
    this.setDateRange('', '');
  }

  public resetFilters(): void {
    this.filters.set({
      searchQuery: '',
      sp: '',
      type: '',
      criticality: '',
      client: '',
      team: '',
      assignee: '',
      dateFrom: '',
      dateTo: ''
    });
  }
}
