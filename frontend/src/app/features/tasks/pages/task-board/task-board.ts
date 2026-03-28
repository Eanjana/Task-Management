/**
 * @description Task kanban board page with drag-and-drop
 * @author Anjana E
 * @date 24-03-2026
 */
import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { TaskService } from '../../services/task.service';
import { TaskFormComponent } from '../../components/task-form/task-form';
import { TaskDetailsComponent } from '../../components/task-details/task-details';
import { LogWorkDialogComponent } from '../../components/log-work-dialog/log-work-dialog';
import { Task, TaskStatus, TaskUpdatePayload, PRIORITY_LABELS, STATUS_LABELS } from '../../models/task.interface';
import { ToastService } from '../../../../core/services/toast.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FilterService } from '../../../../core/services/filter.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [TaskFormComponent, TaskDetailsComponent, LogWorkDialogComponent],
  templateUrl: './task-board.html',
  styleUrl: './task-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskBoardComponent implements OnInit {
  protected taskService = inject(TaskService);
  private toast = inject(ToastService);
  protected authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  protected showDetails = signal(false);
  protected showLogWork = signal(false);
  protected readonly priorityLabels = PRIORITY_LABELS;
  protected readonly statusLabels = STATUS_LABELS;
  protected editingTask = signal<Task | null>(null);
  protected detailsTask = signal<Task | null>(null);
  protected logWorkTask = signal<Task | null>(null);
  protected draggedTask = signal<Task | null>(null);
  protected confirmDeleteTask = signal<Task | null>(null);

  protected filterService = inject(FilterService);

  private applyFilters(tasks: Task[]): Task[] {
    const filters = this.filterService.filters();
    let result = tasks;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter((t) => 
        t.title.toLowerCase().includes(q) ||
        (t.team && t.team.toLowerCase().includes(q))
      );
    }
    if (filters.criticality) {
      result = result.filter(
        (t) => (PRIORITY_LABELS[t.priority] || '').toLowerCase() === filters.criticality.toLowerCase()
      );
    }
    if (filters.team) {
      const teamFilter = filters.team.toLowerCase().trim();
      result = result.filter((t) => 
        t.team?.toLowerCase().trim().includes(teamFilter)
      );
    }
    if (filters.assignee) {
      if (filters.assignee === 'Me') {
        const currentUser = this.authService.currentUser();
        if (currentUser) {
          result = result.filter((t) => t.assignee_id === currentUser.id);
        }
      } else if (filters.assignee === 'Unassigned') {
        result = result.filter((t) => !t.assignee);
      } else {
        const a = filters.assignee.toLowerCase();
        result = result.filter((t) => t.assignee?.username.toLowerCase().includes(a));
      }
    }
    
    if (filters.dateFrom || filters.dateTo) {
      result = result.filter(t => {
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

    return result;
  }

  protected filteredTodoTasks = computed(() => this.applyFilters(this.taskService.todoTasks()));
  protected filteredInProgressTasks = computed(() => this.applyFilters(this.taskService.inProgressTasks()));
  protected filteredCompletedTasks = computed(() => this.applyFilters(this.taskService.completedTasks()));

  ngOnInit(): void {
    this.taskService.loadTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  openCreateModal(): void {
    this.editingTask.set(null);
    this.filterService.showCreateTaskModal.set(true);
  }

  openEditModal(task: Task): void {
    this.editingTask.set(task);
    this.filterService.showCreateTaskModal.set(true);
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

  openLogWorkDialog(task: Task): void {
    this.logWorkTask.set(task);
    this.showLogWork.set(true);
  }

  closeLogWorkDialog(): void {
    this.showLogWork.set(false);
    this.logWorkTask.set(null);
    this.taskService.loadTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  onDetailsEdit(task: Task): void {
    this.closeDetailsModal();
    this.openEditModal(task);
  }

  onDetailsDelete(task: Task): void {
    this.confirmDeleteTask.set(task);
  }

  deleteTask(task: Task, event: Event): void {
    event.stopPropagation();
    this.confirmDeleteTask.set(task);
  }

  cancelDelete(): void {
    this.confirmDeleteTask.set(null);
  }

  onConfirmDelete(): void {
    const task = this.confirmDeleteTask();
    if (task) {
      this.taskService.deleteTask(task.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.toast.success('Task deleted successfully');
          this.confirmDeleteTask.set(null);
          this.closeDetailsModal();
        },
        error: () => {
          // Error handled by interceptor
        },
      });
    }
  }

  onFormSaved(): void {
    this.closeForm();
    this.taskService.loadTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  // ── Drag & Drop Handlers ──
  onDragStart(task: Task, event: DragEvent): void {
    this.draggedTask.set(task);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', task.id.toString());
    }
    // Defer adding dragging class
    setTimeout(() => {
      (event.target as HTMLElement).classList.add('task-card--dragging');
    }, 0);
  }

  onDragEnd(event: DragEvent): void {
    (event.target as HTMLElement).classList.remove('task-card--dragging');
    this.draggedTask.set(null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    const target = (event.target as HTMLElement).closest('.kanban__cards');
    if (target) target.classList.add('kanban__cards--drag-over');
  }

  onDragLeave(event: DragEvent): void {
    const target = (event.target as HTMLElement).closest('.kanban__cards');
    if (target) target.classList.remove('kanban__cards--drag-over');
  }

  onDrop(newStatus: TaskStatus, event: DragEvent): void {
    event.preventDefault();
    const target = (event.target as HTMLElement).closest('.kanban__cards');
    if (target) target.classList.remove('kanban__cards--drag-over');

    const task = this.draggedTask();
    if (!task) return;

    if (task.status === newStatus) return; // No change
    this.updateTaskStatus(task, newStatus);
  }

  private updateTaskStatus(task: Task, newStatus: TaskStatus): void {
    // Optimistic update
    this.taskService.updateTaskStatusLocally(task.id, newStatus);

    const payload: TaskUpdatePayload = { status: newStatus };

    // API update
    this.taskService
      .updateTask(task.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          // Revert optimistic update
          this.taskService.loadTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
        },
    });
  }

  getPerformanceInfo(task: Task) {
    return this.taskService.getPerformanceInfo(task);
  }
}
