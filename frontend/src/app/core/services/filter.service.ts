import { Injectable, signal } from '@angular/core';

export interface FilterState {
  searchQuery: string;
  sp: string;
  type: string;
  criticality: string;
  client: string;
  team: string;
  assignee: string;
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
    assignee: ''
  });

  public updateFilter(key: keyof FilterState, value: string): void {
    this.filters.update(current => ({
      ...current,
      [key]: value
    }));
  }

  public resetFilters(): void {
    this.filters.set({
      searchQuery: '',
      sp: '',
      type: '',
      criticality: '',
      client: '',
      team: '',
      assignee: ''
    });
  }
}
