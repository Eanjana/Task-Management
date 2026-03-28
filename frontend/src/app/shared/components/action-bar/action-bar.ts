/**
 * @description Action bar with search, filters, date range picker, and view toggles
 * @author Anjana E
 * @date 28-03-2026
 */
import { Component, ChangeDetectionStrategy, inject, computed, signal, HostListener } from '@angular/core';
import { FilterService, FilterState } from '../../../core/services/filter.service';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

interface CalendarDay {
  date: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateStr: string;
}

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

  protected activeDropdown = signal<'team' | 'criticality' | 'assignee' | null>(null);

  /** Calendar state */
  protected showCalendar = signal(false);
  protected calendarMonth = signal(new Date().getMonth());
  protected calendarYear = signal(new Date().getFullYear());
  protected rangeStart = signal<string>('');
  protected rangeEnd = signal<string>('');
  protected hoverDate = signal<string>('');

  /** Computed month name and year for the calendar header */
  protected calendarTitle = computed(() => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[this.calendarMonth()]} ${this.calendarYear()}`;
  });

  /** Computed calendar days grid */
  protected calendarDays = computed<CalendarDay[]>(() => {
    const month = this.calendarMonth();
    const year = this.calendarYear();
    const today = new Date();
    const todayStr = this.toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    // Previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      days.push({
        date: d, month: m, year: y,
        isCurrentMonth: false, isToday: false,
        dateStr: this.toDateStr(y, m, d)
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = this.toDateStr(year, month, d);
      days.push({
        date: d, month, year,
        isCurrentMonth: true, isToday: ds === todayStr,
        dateStr: ds
      });
    }

    // Next month's leading days
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      days.push({
        date: d, month: m, year: y,
        isCurrentMonth: false, isToday: false,
        dateStr: this.toDateStr(y, m, d)
      });
    }

    return days;
  });

  /** Display label for the date range button */
  protected dateRangeLabel = computed(() => {
    const from = this.filterService.filters().dateFrom;
    const to = this.filterService.filters().dateTo;
    if (from && to) {
      return `${this.formatShortDate(from)} – ${this.formatShortDate(to)}`;
    }
    if (from) {
      return this.formatShortDate(from);
    }
    return 'Date Range';
  });

  protected hasDateFilter = computed(() => {
    const f = this.filterService.filters();
    return !!(f.dateFrom || f.dateTo);
  });

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeDropdowns();
    this.showCalendar.set(false);
  }

  toggleDropdown(name: 'team' | 'criticality' | 'assignee', event: Event): void {
    event.stopPropagation();
    this.showCalendar.set(false);
    this.activeDropdown.update((curr) => (curr === name ? null : name));
  }

  closeDropdowns(): void {
    this.activeDropdown.set(null);
  }

  onSearchChange(value: string): void {
    this.filterService.updateFilter('searchQuery', value);
  }

  onFilterChange(key: keyof FilterState, value: string): void {
    this.filterService.updateFilter(key, value);
    this.closeDropdowns();
  }

  openCreateModal(): void {
    this.filterService.showCreateTaskModal.set(true);
  }

  // ── Calendar Methods ──

  toggleCalendar(event: Event): void {
    event.stopPropagation();
    this.closeDropdowns();
    this.showCalendar.update(v => !v);

    // Initialize calendar to show the range start month if set
    if (this.showCalendar()) {
      const from = this.filterService.filters().dateFrom;
      if (from) {
        const d = new Date(from);
        this.calendarMonth.set(d.getMonth());
        this.calendarYear.set(d.getFullYear());
      } else {
        const now = new Date();
        this.calendarMonth.set(now.getMonth());
        this.calendarYear.set(now.getFullYear());
      }
      this.rangeStart.set(this.filterService.filters().dateFrom);
      this.rangeEnd.set(this.filterService.filters().dateTo);
    }
  }

  prevMonth(event: Event): void {
    event.stopPropagation();
    if (this.calendarMonth() === 0) {
      this.calendarMonth.set(11);
      this.calendarYear.update(y => y - 1);
    } else {
      this.calendarMonth.update(m => m - 1);
    }
  }

  nextMonth(event: Event): void {
    event.stopPropagation();
    if (this.calendarMonth() === 11) {
      this.calendarMonth.set(0);
      this.calendarYear.update(y => y + 1);
    } else {
      this.calendarMonth.update(m => m + 1);
    }
  }

  selectDate(day: CalendarDay, event: Event): void {
    event.stopPropagation();
    const dateStr = day.dateStr;

    if (!this.rangeStart() || (this.rangeStart() && this.rangeEnd())) {
      // Start a new selection
      this.rangeStart.set(dateStr);
      this.rangeEnd.set('');
    } else {
      // Set end date
      if (dateStr < this.rangeStart()) {
        // Swap if user picked earlier date
        this.rangeEnd.set(this.rangeStart());
        this.rangeStart.set(dateStr);
      } else {
        this.rangeEnd.set(dateStr);
      }
      // Apply filter
      this.filterService.setDateRange(this.rangeStart(), this.rangeEnd());
      this.showCalendar.set(false);
    }
  }

  onDayHover(day: CalendarDay): void {
    if (this.rangeStart() && !this.rangeEnd()) {
      this.hoverDate.set(day.dateStr);
    }
  }

  isInRange(dateStr: string): boolean {
    const start = this.rangeStart();
    const end = this.rangeEnd() || this.hoverDate();
    if (!start || !end) return false;

    const effectiveStart = start < end ? start : end;
    const effectiveEnd = start < end ? end : start;
    return dateStr >= effectiveStart && dateStr <= effectiveEnd;
  }

  isRangeStart(dateStr: string): boolean {
    return dateStr === this.rangeStart();
  }

  isRangeEnd(dateStr: string): boolean {
    const end = this.rangeEnd() || this.hoverDate();
    return !!end && dateStr === end;
  }

  clearDateRange(event: Event): void {
    event.stopPropagation();
    this.rangeStart.set('');
    this.rangeEnd.set('');
    this.hoverDate.set('');
    this.filterService.clearDateRange();
    this.showCalendar.set(false);
  }

  /** Helpers */
  private toDateStr(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private formatShortDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
}
