/**
 * @description Task list page showing tasks in a professional data table
 * @author Anjana E
 * @date 28-03-2026
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { TaskFormComponent } from '../../components/task-form/task-form';
import { TaskDetailsComponent } from '../../components/task-details/task-details';
import { LogWorkDialogComponent } from '../../components/log-work-dialog/log-work-dialog';
import { PRIORITY_LABELS, STATUS_LABELS, Task, TaskStatus } from '../../models/task.interface';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FilterService } from '../../../../core/services/filter.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [TaskFormComponent, TaskDetailsComponent, LogWorkDialogComponent, DatePipe],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskListComponent implements OnInit {
  protected taskService = inject(TaskService);
  private toast = inject(ToastService);
  protected authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  protected showDetails = signal(false);
  protected hideCompleted = signal(false);
  protected editingTask = signal<Task | null>(null);
  protected detailsTask = signal<Task | null>(null);
  protected logWorkTask = signal<Task | null>(null);
  protected activeMenuId = signal<number | null>(null);
  protected confirmDeleteTask = signal<Task | null>(null);
  protected isBulkDeleting = signal(false);

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly statuses: TaskStatus[] = ['todo', 'in_progress', 'completed'];

  protected selectedTaskIds = signal<Set<number>>(new Set());
  protected filterService = inject(FilterService);

  /** Computed filtered tasks for the table template */
  protected filteredTasks = computed(() => {
    let allTasks = this.taskService.tasks();
    const filters = this.filterService.filters();

    if (this.hideCompleted()) {
      allTasks = allTasks.filter(t => t.status !== 'completed');
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      allTasks = allTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.team && t.team.toLowerCase().includes(q))
      );
    }

    if (filters.criticality) {
      allTasks = allTasks.filter(
        (t) => PRIORITY_LABELS[t.priority]?.toLowerCase() === filters.criticality.toLowerCase()
      );
    }

    if (filters.team) {
      const q = filters.team.toLowerCase().trim();
      allTasks = allTasks.filter((t) => t.team?.toLowerCase().includes(q));
    }

    if (filters.assignee) {
      if (filters.assignee === 'Me') {
        const currentUser = this.authService.currentUser();
        if (currentUser) {
          allTasks = allTasks.filter((t) => t.assignee_id === currentUser.id);
        }
      } else if (filters.assignee === 'Unassigned') {
        allTasks = allTasks.filter((t) => !t.assignee);
      } else {
        const a = filters.assignee.toLowerCase();
        allTasks = allTasks.filter((t) => t.assignee?.username.toLowerCase().includes(a));
      }
    }

    // Date range filtering
    if (filters.dateFrom || filters.dateTo) {
      allTasks = allTasks.filter(t => {
        try {
          const createdStr = new Date(t.created_at).toISOString().split('T')[0];
          if (filters.dateFrom && filters.dateTo) {
            return createdStr >= filters.dateFrom && createdStr <= filters.dateTo;
          }
          if (filters.dateFrom) {
            return createdStr >= filters.dateFrom;
          }
          return createdStr <= filters.dateTo;
        } catch {
          return false;
        }
      });
    }

    return allTasks;
  });

  ngOnInit(): void {
    this.taskService.loadTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  /**
   * @description Format the total time taken for a task including active working sessions
   */
  getTimeTaken(task: Task): string {
    let totalMinutes = task.total_time_spent_minutes || 0;

    // Add elapsed time from currently active members
    if (task.active_members.length) {
      const now = new Date();
      for (const member of task.active_members) {
        if (member.started_at) {
          const started = new Date(member.started_at);
          const elapsedMs = now.getTime() - started.getTime();
          totalMinutes += Math.max(0, Math.floor(elapsedMs / 60000));
        }
      }
    }

    return this.taskService.formatDuration(totalMinutes);
  }

  /**
   * @description Format the assigned time for display
   */
  getAssignTime(task: Task): string {
    return this.taskService.formatHours(task.assigned_time_minutes);
  }

  toggleAllSelections(): void {
    const allIds = this.filteredTasks().map((t) => t.id);
    const current = this.selectedTaskIds();
    if (current.size === allIds.length && allIds.length > 0) {
      this.selectedTaskIds.set(new Set());
    } else {
      this.selectedTaskIds.set(new Set(allIds));
    }
  }

  deleteSelectedTasks(): void {
    if (this.selectedTaskIds().size > 0) {
      this.isBulkDeleting.set(true);
    }
  }

  onConfirmBulkDelete(): void {
    const ids = Array.from(this.selectedTaskIds());
    let deletedCount = 0;
    ids.forEach(id => {
      this.taskService.deleteTask(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          deletedCount++;
          if (deletedCount === ids.length) {
            this.toast.success(`${deletedCount} tasks deleted`);
            this.selectedTaskIds.set(new Set());
            this.isBulkDeleting.set(false);
          }
        },
        error: () => {
          this.isBulkDeleting.set(false);
        },
      });
    });
  }

  toggleTaskSelection(id: number, event: Event): void {
    event.stopPropagation();
    const current = new Set(this.selectedTaskIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedTaskIds.set(current);
  }

  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.activeMenuId.set(this.activeMenuId() === id ? null : id);
  }

  closeMenus(): void {
    this.activeMenuId.set(null);
  }

  openCreateModal(): void {
    this.editingTask.set(null);
    this.filterService.showCreateTaskModal.set(true);
  }

  openEditModal(task: Task): void {
    this.editingTask.set(task);
    this.filterService.showCreateTaskModal.set(true);
    this.closeMenus();
  }

  openLogWorkModal(task: Task): void {
    this.logWorkTask.set(task);
    this.closeMenus();
  }

  closeLogWorkModal(): void {
    this.logWorkTask.set(null);
    this.taskService.loadTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  closeForm(): void {
    this.filterService.showCreateTaskModal.set(false);
    this.editingTask.set(null);
  }

  openDetailsModal(task: Task): void {
    this.detailsTask.set(task);
    this.showDetails.set(true);
  }

  closeDetailsModal(): void {
    this.showDetails.set(false);
    this.detailsTask.set(null);
  }

  onDetailsEdit(task: Task): void {
    this.closeDetailsModal();
    this.openEditModal(task);
  }

  onDetailsDelete(task: Task): void {
    this.confirmDeleteTask.set(task);
  }

  onConfirmDelete(): void {
    const task = this.confirmDeleteTask();
    if (task) {
      this.taskService.deleteTask(task.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.toast.success('Task deleted successfully');
          this.confirmDeleteTask.set(null);
          this.closeDetailsModal();
          this.closeMenus();
        },
        error: () => {
          this.confirmDeleteTask.set(null);
        },
      });
    }
  }

  cancelDelete(): void {
    this.confirmDeleteTask.set(null);
    this.isBulkDeleting.set(false);
  }

  onFormSaved(): void {
    this.closeForm();
    this.taskService.loadTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  deleteTask(task: Task): void {
    this.confirmDeleteTask.set(task);
  }

  getPerformanceInfo(task: Task) {
    return this.taskService.getPerformanceInfo(task);
  }
}
