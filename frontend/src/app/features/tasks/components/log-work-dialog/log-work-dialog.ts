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
  date: string;
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
  protected taskService = inject(TaskService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  task = input.required<Task>();
  closed = output<void>();
  saved = output<void>();

  protected isSubmitting = signal(false);
  protected entries = signal<WorkEntry[]>([
    { date: new Date().toISOString().split('T')[0], startTime: '00:00', endTime: '00:00', description: '' }
  ]);

  /**
   * @description Add a new empty work entry row
   */
  addEntry(): void {
    this.entries.update(arr => [...arr, { date: new Date().toISOString().split('T')[0], startTime: '00:00', endTime: '00:00', description: '' }]);
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
   * @description Calculate seconds between two time strings (HH:MM)
   */
  calculateSeconds(start: string, end: string): number {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startSecs = sh * 3600 + sm * 60;
    const endSecs = eh * 3600 + em * 60;
    return Math.max(0, endSecs - startSecs);
  }

  /**
   * @description Get total seconds from all entries
   */
  protected getTotalSeconds(): number {
    return this.entries().reduce((sum, entry) => {
      return sum + this.calculateSeconds(entry.startTime, entry.endTime);
    }, 0);
  }

  /**
   * @description Format seconds to human-readable string
   */
  protected formatSeconds(seconds: number): string {
    return this.taskService.formatHours(seconds);
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
    let completedCount = 0;
    const taskId = this.task().id;
    const currentUser = this.authService.currentUser();

    validEntries.forEach(entry => {
      const seconds = this.calculateSeconds(entry.startTime, entry.endTime);
      const payload: WorkLogCreatePayload = {
        start_time: `${entry.date} ${entry.startTime}`,
        end_time: `${entry.date} ${entry.endTime}`,
        seconds_spent: seconds,
        description: entry.description,
      };

      this.taskService.addWorkLog(taskId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            completedCount++;
            if (completedCount === validEntries.length) {
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
