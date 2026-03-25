/**
 * @description Task details view component
 * @author Developer
 * @date 24-03-2026
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Task, STATUS_LABELS, PRIORITY_LABELS } from '../../models/task.interface';
import { environment } from '../../../../../environments/environment';

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

  /**
   * @description Get human readable time string
   */
  protected formattedTime = computed(() => {
    const minutes = this.task().time_taken_minutes;
    if (!minutes) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  });

  /**
   * @description Get full URL for file attachment
   */
  getAttachmentUrl(path: string): string {
    // Correctly handle backslashes on Windows and forward slashes on Linux
    const normalizedPath = path.replace(/\\/g, '/');
    // Basic implementation: uploadUrl is '.../uploads'.
    // Path contains 'uploads/...'.
    // Remove duplication
    const pathAfterUploads = normalizedPath.split('uploads/').pop() || '';
    return `${environment.uploadUrl}/${pathAfterUploads}`;
  }
}
