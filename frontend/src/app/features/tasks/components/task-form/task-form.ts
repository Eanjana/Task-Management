/**
 * @description Task form modal component for creating and editing tasks
 * @author Anjana E
 * @date 24-03-2026
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  input,
  output,
  effect,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AuthService, User } from '../../../../core/services/auth.service';
import {
  Task,
  TaskCreatePayload,
  TaskStatus,
  TaskPriority,
  TaskAttachment,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from '../../models/task.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormComponent implements OnInit {
  private taskService = inject(TaskService);
  private toast = inject(ToastService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  /** Inputs */
  task = input<Task | null>(null);

  /** Outputs */
  closed = output<void>();
  saved = output<void>();

  /** Form state */
  protected title = signal('');
  protected description = signal('');
  protected status = signal<TaskStatus>('todo');
  protected priority = signal<TaskPriority>('normal');
  protected timeHours = signal(0);
  protected timeMinutes = signal(0);
  protected assigneeId = signal<number | null>(null);
  protected team = signal(''); // Added
  protected isSubmitting = signal(false);
  protected createdDate = signal<string>('');
  protected createdTime = signal<string>('');
  protected dueDate = signal<string>('');
  protected selectedFile = signal<File | null>(null);
  protected previewUrl = signal<string | null>(null);
  protected existingAttachments = signal<TaskAttachment[]>([]);
  protected users = signal<User[]>([]);

  protected readonly statusOptions = Object.entries(STATUS_LABELS);
  protected readonly priorityOptions = Object.entries(PRIORITY_LABELS);
  protected readonly uploadUrl = environment.uploadUrl;

  protected isEditMode = signal(false);

  constructor() {
    effect(() => {
      const t = this.task();
      if (t) {
        this.isEditMode.set(true);
        this.title.set(t.title);
        this.description.set(t.description ?? '');
        this.status.set(t.status);
        this.priority.set(t.priority);
        this.timeHours.set(Math.floor(t.assigned_time_minutes / 60));
        this.timeMinutes.set(t.assigned_time_minutes % 60);
        this.assigneeId.set(t.assignee_id);
        this.team.set(t.team ?? '');
        this.dueDate.set(t.due_at ? t.due_at.split('T')[0] : '');
        this.existingAttachments.set(t.attachments || []);
      } else {
        this.isEditMode.set(false);
        this.title.set('');
        this.description.set('');
        this.status.set('todo');
        this.priority.set('normal');
        this.timeHours.set(0);
        this.timeMinutes.set(0);
        this.team.set('');
        this.createdDate.set('');
        this.createdTime.set('');
        this.dueDate.set('');
        this.existingAttachments.set([]);
        this.clearSelectedFile();

        // Auto-assign to current user on create
        const currentUser = this.authService.currentUser();
        if (currentUser) {
          this.assigneeId.set(currentUser.id);
        }
      }
    });
  }

  ngOnInit(): void {
    this.authService
      .getAllUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => this.users.set(users),
      });
  }

  /**
   * @description Handle file selection for attachment
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);

      const reader = new FileReader();
      reader.onload = () => this.previewUrl.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  /**
   * @description Submit the form to create or update a task
   */
  onSubmit(): void {
    if (!this.title().trim()) return;

    this.isSubmitting.set(true);
    const totalMinutes = this.timeHours() * 60 + this.timeMinutes();

    const payload: TaskCreatePayload = {
      title: this.title().trim(),
      description: this.description().trim(),
      status: this.status(),
      priority: this.priority(),
      assigned_time_minutes: totalMinutes,
      assignee_id: this.assigneeId(),
      team: this.team().trim(),
      created_at: this.getCombinedCreatedAt(),
      due_at: this.dueDate() ? `${this.dueDate()}T23:59:59` : undefined,
    };

    const task = this.task();

    if (this.isEditMode() && task) {
      this.taskService
        .updateTask(task.id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updated) => {
            if (this.selectedFile()) {
              this.taskService.uploadAttachment(updated.id, this.selectedFile()!)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => this.completeSubmission());
            } else {
              this.completeSubmission();
            }
          },
          error: () => this.isSubmitting.set(false),
        });
    } else {
      this.taskService
        .createTask(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (created) => {
            if (this.selectedFile()) {
              this.taskService.uploadAttachment(created.id, this.selectedFile()!)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => this.completeSubmission());
            } else {
              this.completeSubmission();
            }
          },
          error: () => this.isSubmitting.set(false),
        });
    }
  }

  private getCombinedCreatedAt(): string | undefined {
    // If both are empty, let server handle it (current datetime)
    if (!this.createdDate() && !this.createdTime()) return undefined;
    
    const now = new Date();
    // Get local date part (YYYY-MM-DD)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const localDate = `${year}-${month}-${date}`;

    // Use selected date or local today's date
    const datePart = this.createdDate() || localDate;
    
    // Use selected time (HH:mm) or current local time
    // toTimeString() returns something like "13:33:21 GMT+0530"
    const timePart = this.createdTime() || now.toTimeString().split(' ')[0].substring(0, 5);
    
    return `${datePart}T${timePart}:00`;
  }

  private completeSubmission(): void {
    this.toast.success(this.isEditMode() ? 'Task updated' : 'Task created');
    this.isSubmitting.set(false);
    this.saved.emit();
  }

  protected getAttachmentUrl(path: string): string {
    const normalizedPath = path.replace(/\\/g, '/');
    const pathAfterUploads = normalizedPath.split('uploads/').pop() || '';
    return `${environment.uploadUrl}/${pathAfterUploads}`;
  }

  private uploadFile(taskId: number): void {
    const file = this.selectedFile();
    if (!file) return;

    this.taskService
      .uploadAttachment(taskId, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  /**
   * @description Close the modal
   */
  onClose(): void {
    this.closed.emit();
  }

  /**
   * @description Remove existing attachment
   */
  removeAttachment(attId: number): void {
    if (confirm('Are you sure you want to remove this attachment?')) {
      this.taskService
        .deleteAttachment(attId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.existingAttachments.update((arr) =>
              arr.filter((a) => a.id !== attId)
            );
            this.toast.success('Attachment removed');
          },
          error: () => {
            // Error handeled by global interceptor
          },
        });
    }
  }

  /**
   * @description Clear selected file before upload
   */
  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  /**
   * @description Handle backdrop click to close
   */
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('task-modal__backdrop')) {
      this.onClose();
    }
  }
}
