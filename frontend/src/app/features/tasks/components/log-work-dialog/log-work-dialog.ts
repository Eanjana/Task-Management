/**
 * @description Log Work dialog component for recording time entries
 * @author Anjana E
 * @date 26-03-2026
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  output,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Task, WorkLogCreatePayload } from '../../models/task.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface WorkEntry {
  startTime: string;
  endTime: string;
  description: string;
}

@Component({
  selector: 'app-log-work-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './log-work-dialog.html',
  styleUrl: './log-work-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogWorkDialogComponent {
  private taskService = inject(TaskService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  task = input.required<Task>();
  closed = output<void>();
  saved = output<void>();

  protected isSubmitting = signal(false);
  protected entries = signal<WorkEntry[]>([
    { startTime: '', endTime: '', description: '' }
  ]);

  /**
   * @description Add a new empty work entry row
   */
  addEntry(): void {
    this.entries.update(arr => [...arr, { startTime: '', endTime: '', description: '' }]);
  }

  /**
   * @description Remove a work entry by index
   */
  removeEntry(index: number): void {
    this.entries.update(arr => arr.filter((_, i) => i !== index));
  }

  /**
   * @description Update a specific field in an entry
   */
  updateEntry(index: number, field: keyof WorkEntry, value: string): void {
    this.entries.update(arr =>
      arr.map((entry, i) => i === index ? { ...entry, [field]: value } : entry)
    );
  }

  /**
   * @description Calculate minutes between two time strings (HH:MM)
   */
  calculateMinutes(start: string, end: string): number {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    return Math.max(0, endMins - startMins);
  }

  /**
   * @description Get total minutes from all entries
   */
  protected getTotalMinutes(): number {
    return this.entries().reduce((sum, entry) => {
      return sum + this.calculateMinutes(entry.startTime, entry.endTime);
    }, 0);
  }

  /**
   * @description Format minutes to human-readable string
   */
  protected formatTime(minutes: number): string {
    if (minutes === 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  /**
   * @description Submit all work entries
   */
  onSubmit(): void {
    const validEntries = this.entries().filter(e => e.startTime && e.endTime);
    if (validEntries.length === 0) {
      this.toast.error('Please add at least one time entry');
      return;
    }

    this.isSubmitting.set(true);
    let completed = 0;
    const taskId = this.task().id;
    const currentUser = this.authService.currentUser();

    validEntries.forEach(entry => {
      const minutes = this.calculateMinutes(entry.startTime, entry.endTime);
      const payload: WorkLogCreatePayload = {
        start_time: entry.startTime,
        end_time: entry.endTime,
        minutes_spent: minutes,
        description: entry.description,
      };

      this.taskService.addWorkLog(taskId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            completed++;
            if (completed === validEntries.length) {
              // Now update the task to completed with completed_by
              const updatePayload: any = {
                status: 'completed' as const,
                completed_by_id: currentUser?.id ?? null,
              };

              this.taskService.updateTask(taskId, updatePayload)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                  next: () => {
                    this.toast.success('Work logged & task completed!');
                    this.isSubmitting.set(false);
                    this.saved.emit();
                  },
                  error: () => {
                    this.toast.error('Work logged but failed to update task status');
                    this.isSubmitting.set(false);
                    this.saved.emit();
                  },
                });
            }
          },
          error: () => {
            this.toast.error('Failed to log work entry');
            this.isSubmitting.set(false);
          },
        });
    });
  }

  /**
   * @description Handle backdrop click to close
   */
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('log-work__backdrop')) {
      this.closed.emit();
    }
  }
}
