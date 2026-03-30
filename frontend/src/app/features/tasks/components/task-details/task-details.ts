/**
 * @description Task details view component showing time tracking, work logs, and active members
 * @author Anjana E
 * @date 26-03-2026
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  computed,
  signal,
  DestroyRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Task, STATUS_LABELS, PRIORITY_LABELS } from '../../models/task.interface';
import { environment } from '../../../../../environments/environment';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './task-details.html',
  styleUrl: './task-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDetailsComponent {
  task = input.required<Task>();
  closed = output<void>();
  edit = output<Task>();
  delete = output<Task>();

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly priorityLabels = PRIORITY_LABELS;

  protected taskService = inject(TaskService);
  protected authService = inject(AuthService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  protected isStarting = signal(false);
  protected isStopping = signal(false);

  /** Reacts to global task changes (like time tracking/starting/stopping) */
  protected currentTask = computed(() => {
    return this.taskService.tasks().find(t => t.id === this.task().id) || this.task();
  });

  /** Whether the current user is actively working on this task */
  protected isCurrentUserWorking = computed(() => {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;
    return this.currentTask().active_members?.some(m => m.user_id === currentUser.id) ?? false;
  });

  protected formattedAssignedTime = computed(() => {
    const seconds = this.currentTask().assigned_time_seconds;
    return this.taskService.formatHours(seconds);
  });

  /**
   * @description Total time spent formatted as human-readable string
   */
  protected formattedTimeSpent = computed(() => {
    const seconds = this.taskService.getWorkingSecondsSpent(this.currentTask());
    return this.taskService.formatDuration(seconds);
  });

  /**
   * @description Performance insight (Time Working vs Budget)
   */
  protected workPerformanceInfo = computed(() => this.taskService.getPerformanceInfo(this.currentTask()));

  /**
   * @description Calendar performance insight (Timeline vs Assigned)
   */
  protected timelinePerformanceInfo = computed(() => this.taskService.getTimelinePerformance(this.currentTask()));

  /**
   * @description Labor efficiency insight (Actual Work vs Budget)
   */
  protected laborPerformanceInfo = computed(() => this.taskService.getLaborPerformance(this.currentTask()));

  protected workLogSummary = computed(() => {
    const logs = this.currentTask().work_logs || [];
    
    // Group by username
    const grouped = new Map<string, { total_seconds: number, user_id: number }>();
    let totalAllUsers = 0;

    for (const log of logs) {
      if (!log.user) continue;
      
      const username = log.user.username;
      totalAllUsers += log.seconds_spent;

      if (!grouped.has(username)) {
        grouped.set(username, { total_seconds: 0, user_id: log.user_id });
      }
      
      grouped.get(username)!.total_seconds += log.seconds_spent;
    }

    return {
      totalAllUsersSeconds: totalAllUsers,
      groupedLogs: Array.from(grouped.entries()).map(([username, data]) => ({
        username,
        user_id: data.user_id,
        total_seconds: data.total_seconds
      })).sort((a, b) => b.total_seconds - a.total_seconds)
    };
  });

  /**
   * @description Delete a work log after confirmation
   */
  protected logToDelete = signal<number | null>(null);

  confirmDeleteLog(id: number): void {
    this.logToDelete.set(id);
  }

  cancelDeleteLog(): void {
    this.logToDelete.set(null);
  }

  deleteWorkLog(): void {
    const id = this.logToDelete();
    if (id === null) return;

    this.taskService.deleteWorkLog(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Work log deleted successfully');
          this.logToDelete.set(null);
          this.taskService.loadTasks().subscribe(); // Refresh to update totals
        },
        error: () => {
          this.toast.error('Failed to delete work log');
          this.logToDelete.set(null);
        }
      });
  }

  /**
   * @description Start working on the task
   */
  startWorking(): void {
    this.isStarting.set(true);
    this.taskService.startWorking(this.task().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('You are now working on this task!');
          this.isStarting.set(false);
        },
        error: (err) => {
          // Error handled by global interceptor
          this.isStarting.set(false);
        },
      });
  }

  /**
   * @description Stop working on the task
   */
  stopWorking(): void {
    this.isStopping.set(true);
    this.taskService.stopWorking(this.task().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Stopped working on this task.');
          this.isStopping.set(false);
        },
        error: () => {
          // Error handled by global interceptor
          this.isStopping.set(false);
        },
      });
  }


  /**
   * @description Convert 24-hour time string (HH:mm) to 12-hour format (h:mm AM/PM)
   */
  formatTime12h(timeStr: string): string {
    if (!timeStr) return '—';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;

    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${hours}:${minutes} ${ampm}`;
  }

  /**
   * @description Get full URL for file attachment
   */
  getAttachmentUrl(path: string): string {
    const normalizedPath = path.replace(/\\/g, '/');
    const pathAfterUploads = normalizedPath.split('uploads/').pop() || '';
    return `${environment.uploadUrl}/${pathAfterUploads}`;
  }

  /**
   * @description Get a generated consistent random color for avatar string
   */
  getAvatarColor(name?: string): string {
    return this.taskService.getAvatarColor(name);
  }
}
