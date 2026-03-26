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

  private taskService = inject(TaskService);
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

  /**
   * @description Assigned time formatted as human-readable string
   */
  protected formattedAssignedTime = computed(() => {
    const minutes = this.currentTask().assigned_time_minutes;
    return this.formatMinutes(minutes);
  });

  /**
   * @description Total time spent formatted as human-readable string
   */
  protected formattedTimeSpent = computed(() => {
    const minutes = this.currentTask().total_time_spent_minutes;
    return this.formatMinutes(minutes);
  });

  /**
   * @description Performance insight: whether the task was completed under/over estimate
   */
  protected performanceInfo = computed(() => {
    const task = this.currentTask();
    if (task.status !== 'completed' || !task.assigned_time_minutes) return null;

    const diff = (task.total_time_spent_minutes || 0) - (task.assigned_time_minutes || 0);
    const threshold = task.assigned_time_minutes * 0.1;

    if (diff < -threshold) {
      return {
        label: 'Completed Ahead of Schedule',
        color: 'success',
        icon: '↑',
        detail: `Saved ${this.formatMinutes(Math.abs(diff))} vs. estimate`,
        diffText: this.formatMinutes(Math.abs(diff))
      };
    }
    if (diff > threshold) {
      return {
        label: 'Went Over Estimate',
        color: 'danger',
        icon: '↓',
        detail: `Exceeded by ${this.formatMinutes(diff)}`,
        diffText: this.formatMinutes(diff)
      };
    }
    return {
      label: 'On Track',
      color: 'warning',
      icon: '→',
      detail: 'Completed within estimated time',
      diffText: ''
    };
  });

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
   * @description Format minutes to human-readable string
   */
  formatMinutes(minutes: number): string {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
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
