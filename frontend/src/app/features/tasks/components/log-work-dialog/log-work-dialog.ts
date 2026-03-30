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
  computed,
  input,
  output,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Task, WorkLog, WorkLogCreatePayload, WorkLogUpdatePayload } from '../../models/task.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

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
export class LogWorkDialogComponent implements OnInit {
  protected taskService = inject(TaskService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  task = input.required<Task>();
  logToEdit = input<WorkLog | null>(null);
  closed = output<void>();
  saved = output<void>();

  protected isSubmitting = signal(false);
  protected isEditMode = computed(() => !!this.logToEdit());
  protected entries = signal<WorkEntry[]>([]);

  ngOnInit(): void {
    if (this.logToEdit()) {
      const log = this.logToEdit()!;
      this.entries.set([{
        date: log.work_date,
        startTime: log.start_time,
        endTime: log.end_time,
        description: log.description
      }]);
    } else {
      this.entries.set([{
        date: new Date().toISOString().split('T')[0],
        startTime: '00:00',
        endTime: '00:00',
        description: ''
      }]);
    }
  }

  /**
   * @description Add a new empty work entry row
   */
  addEntry(): void {
    if (this.isEditMode()) return;
    this.entries.update(arr => [...arr, { 
      date: new Date().toISOString().split('T')[0], 
      startTime: '00:00', 
      endTime: '00:00', 
      description: '' 
    }]);
  }

  /**
   * @description Remove a work entry by index
   */
  removeEntry(index: number): void {
    if (this.isEditMode()) return;
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
    const taskId = this.task().id;
    const currentUser = this.authService.currentUser();
    const logToEdit = this.logToEdit();

    if (this.isEditMode() && logToEdit) {
      const entry = validEntries[0];
      const seconds = this.calculateSeconds(entry.startTime, entry.endTime);
      const payload: WorkLogUpdatePayload = {
        start_time: entry.startTime,
        end_time: entry.endTime,
        work_date: entry.date,
        seconds_spent: seconds,
        description: entry.description,
      };

      this.taskService.updateWorkLog(logToEdit.id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toast.success('Work log updated');
            this.isSubmitting.set(false);
            this.saved.emit();
          },
          error: () => {
            this.toast.error('Failed to update work log');
            this.isSubmitting.set(false);
          }
        });
    } else {
      const requests = validEntries.map(entry => {
        const seconds = this.calculateSeconds(entry.startTime, entry.endTime);
        const payload: WorkLogCreatePayload = {
          start_time: entry.startTime,
          end_time: entry.endTime,
          work_date: entry.date,
          seconds_spent: seconds,
          description: entry.description,
        };
        return this.taskService.addWorkLog(taskId, payload);
      });

      forkJoin(requests)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            if (this.task().status !== 'completed') {
              const updatePayload = {
                status: 'completed' as const,
                completed_by_id: currentUser?.id ?? null,
              };

              this.taskService.updateTask(taskId, updatePayload as any)
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
            } else {
              this.toast.success('Work logged successfully');
              this.isSubmitting.set(false);
              this.saved.emit();
            }
          },
          error: () => {
            this.toast.error('Failed to log work entries');
            this.isSubmitting.set(false);
          },
        });
    }
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
