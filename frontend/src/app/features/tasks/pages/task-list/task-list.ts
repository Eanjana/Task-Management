/**
 * @description Task list page showing tasks in a professional data table
 * @author Anjana E
 * @date 26-03-2026
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
  imports: [TaskFormComponent, TaskDetailsComponent, LogWorkDialogComponent],
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

    // Date filtering
    if (filters.date) {
      allTasks = allTasks.filter(t => {
        try {
          const createdStr = new Date(t.created_at).toISOString().split('T')[0];
          return createdStr === filters.date;
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
          // Error handled by global interceptor
          this.isBulkDeleting.set(false); // Ensure dialog closes on error too
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
          // Error already handled by global interceptor
          this.confirmDeleteTask.set(null); // Ensure dialog closes on error too
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

  formatTime(minutes: number): string {
    if (minutes === 0) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  getPerformanceInfo(task: Task): { color: string, icon: string, label: string, diffText: string } | null {
    if (task.status !== 'completed' || task.assigned_time_minutes === 0) return null;
    
    const diff = (task.total_time_spent_minutes || 0) - (task.assigned_time_minutes || 0);
    const threshold = task.assigned_time_minutes * 0.1;

    if (diff < -threshold) { 
        return { 
          color: 'success', 
          icon: '↑', 
          label: 'Ahead of schedule',
          diffText: this.formatTime(Math.abs(diff)) 
        }; 
    }
    if (diff > threshold) { 
        return { 
          color: 'danger', 
          icon: '↓', 
          label: 'Behind schedule',
          diffText: this.formatTime(diff) 
        }; 
    }
    return { 
      color: 'warning', 
      icon: '→', 
      label: 'On track',
      diffText: ''
    };
  }
}
