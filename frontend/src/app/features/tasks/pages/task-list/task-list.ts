/**
 * @description Task list page showing tasks grouped by status
 * @author Anjana E
 * @date 24-03-2026
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
import { PRIORITY_LABELS, STATUS_LABELS, Task, TaskStatus } from '../../models/task.interface';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FilterService } from '../../../../core/services/filter.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [TaskFormComponent, TaskDetailsComponent],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskListComponent implements OnInit {
  protected taskService = inject(TaskService);
  private toast = inject(ToastService);
  protected authService = inject(AuthService); // Changed to protected/inject
  private destroyRef = inject(DestroyRef);

  protected showDetails = signal(false);
  protected editingTask = signal<Task | null>(null);
  protected detailsTask = signal<Task | null>(null);

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly statuses: TaskStatus[] = ['todo', 'in_progress', 'completed'];

  protected selectedTaskIds = signal<Set<number>>(new Set());

  protected filterService = inject(FilterService);

  /** Computed filtered tasks for the table template */
  protected filteredTasks = computed(() => {
    let allTasks = this.taskService.tasks();
    const filters = this.filterService.filters();

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      allTasks = allTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.team && t.team.toLowerCase().includes(q)) ||
          STATUS_LABELS[t.status].toLowerCase().includes(q) ||
          PRIORITY_LABELS[t.priority].toLowerCase().includes(q)
      );
    }
    if (filters.criticality) {
      allTasks = allTasks.filter(
        (t) =>
          PRIORITY_LABELS[t.priority]?.toLowerCase() ===
          filters.criticality.toLowerCase()
      );
    }
    if (filters.team) {
      const q = filters.team.toLowerCase().replace(/\s/g, '');
      allTasks = allTasks.filter((t) => 
        t.team?.toLowerCase().replace(/\s/g, '').includes(q)
      );
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
        allTasks = allTasks.filter((t) =>
          t.assignee?.username.toLowerCase().includes(a)
        );
      }
    }

    return allTasks;
  });

  toggleAllSelections(): void {
    const allIds = this.filteredTasks().map((t) => t.id);
    const current = this.selectedTaskIds();
    if (current.size === allIds.length && allIds.length > 0) {
      this.selectedTaskIds.set(new Set());
    } else {
      this.selectedTaskIds.set(new Set(allIds));
    }
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

  deleteSelectedTasks(): void {
    const ids = Array.from(this.selectedTaskIds());
    if (ids.length === 0) return;

    if (confirm(`Are you sure you want to delete ${ids.length} tasks?`)) {
      let deletedCount = 0;
      let hasError = false;

      ids.forEach((id) => {
        this.taskService
          .deleteTask(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              deletedCount++;
              if (deletedCount === ids.length) {
                this.toast.success(`${deletedCount} tasks deleted`);
                this.selectedTaskIds.set(new Set());
              }
            },
            error: () => {
              if (!hasError) {
                this.toast.error('Failed to delete some tasks');
                hasError = true;
              }
            },
          });
      });
    }
  }

  ngOnInit(): void {
    this.taskService.loadTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  /**
   * @description Open the create task modal
   */
  openCreateModal(): void {
    this.editingTask.set(null);
    this.filterService.showCreateTaskModal.set(true);
  }

  /**
   * @description Open the edit task modal
   */
  openEditModal(task: Task): void {
    this.editingTask.set(task);
    this.filterService.showCreateTaskModal.set(true);
  }

  /**
   * @description Close the task form modal
   */
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
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.taskService.deleteTask(task.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.toast.success('Task deleted successfully');
          this.closeDetailsModal();
        },
        error: () => this.toast.error('Failed to delete task'),
      });
    }
  }

  /**
   * @description Handle form save — reload tasks
   */
  onFormSaved(): void {
    this.closeForm();
    this.taskService.loadTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  /**
   * @description Delete a task with confirmation
   */
  deleteTask(task: Task, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm(`Delete "${task.title}"?`)) {
      this.taskService
        .deleteTask(task.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.toast.success('Task deleted'),
        });
    }
  }

  /**
   * @description Format minutes into human-readable time
   */
  formatTime(minutes: number): string {
    if (minutes === 0) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  /**
   * @description Get user initials for avatar
   */
  getInitials(name: string | undefined): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }
}
