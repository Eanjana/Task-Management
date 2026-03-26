/**
 * @description Task service for CRUD operations and state management
 * @author Anjana E
 * @date 24-03-2026
 */
import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Task,
  TaskCreatePayload,
  TaskUpdatePayload,
  TaskStatus,
  TaskAttachment,
  WorkLog,
  WorkLogCreatePayload,
  ActiveMember,
} from '../models/task.interface';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);

  private _tasks = signal<Task[]>([]);
  private _isLoading = signal<boolean>(false);
  private _reloadTasks$ = new Subject<void>();

  /** Public readonly signals */
  readonly tasks = this._tasks.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly reloadTasks$ = this._reloadTasks$.asObservable();

  /** Derived signals for kanban columns */
  readonly todoTasks = computed(() =>
    this._tasks().filter((t) => t.status === 'todo')
  );
  readonly inProgressTasks = computed(() =>
    this._tasks().filter((t) => t.status === 'in_progress')
  );
  readonly completedTasks = computed(() =>
    this._tasks().filter((t) => t.status === 'completed')
  );

  readonly taskCount = computed(() => this._tasks().length);

  /**
   * @description Fetch all tasks from API
   */
  loadTasks(): Observable<Task[]> {
    this._isLoading.set(true);
    return this.http.get<Task[]>(`${environment.apiUrl}/tasks`).pipe(
      tap((tasks) => {
        const enriched = tasks.map(t => this.enrichTaskData(t));
        this._tasks.set(enriched);
        this._isLoading.set(false);
      }),
      catchError((err) => {
        this._isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * @description Enrich task with calculated fields if needed
   */
  private enrichTaskData(task: Task): Task {
    const calculatedTotal = task.work_logs?.reduce((sum, log) => sum + (log.minutes_spent || 0), 0) || 0;
    return {
      ...task,
      total_time_spent_minutes: calculatedTotal || task.total_time_spent_minutes
    };
  }

  /**
   * @description Get a consistent color based on name
   */
  getAvatarColor(name?: string | null): string {
    if (!name) return 'var(--clr-avatar-bg)';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 45%)`;
  }

  /**
   * @description Trigger a reload of all tasks
   */
  triggerReload(): void {
    this._reloadTasks$.next();
  }

  /**
   * @description Create a new task
   */
  createTask(payload: TaskCreatePayload): Observable<Task> {
    return this.http.post<Task>(`${environment.apiUrl}/tasks`, payload).pipe(
      tap((task) => {
        const enriched = this.enrichTaskData(task);
        this._tasks.update((arr) => [enriched, ...arr]);
      }),
      catchError((err) => throwError(() => err))
    );
  }

  /**
   * @description Update an existing task
   */
  updateTask(id: number, payload: TaskUpdatePayload): Observable<Task> {
    return this.http.patch<Task>(`${environment.apiUrl}/tasks/${id}`, payload).pipe(
      tap((updated) => {
        const enriched = this.enrichTaskData(updated);
        this._tasks.update((arr) =>
          arr.map((t) => (t.id === id ? enriched : t))
        );
      }),
      catchError((err) => throwError(() => err))
    );
  }

  /**
   * @description Delete a task
   */
  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/tasks/${id}`).pipe(
      tap(() => {
        this._tasks.update((arr) => arr.filter((t) => t.id !== id));
      }),
      catchError((err) => throwError(() => err))
    );
  }

  /**
   * @description Upload attachment for a task
   */
  uploadAttachment(taskId: number, file: File): Observable<TaskAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<TaskAttachment>(`${environment.apiUrl}/attachments/${taskId}`, formData)
      .pipe(catchError((err) => throwError(() => err)));
  }

  /**
   * @description Delete an attachment by ID
   */
  deleteAttachment(attachmentId: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/attachments/${attachmentId}`)
      .pipe(catchError((err) => throwError(() => err)));
  }

  /**
   * @description Update task status locally (optimistic for drag-and-drop)
   */
  updateTaskStatusLocally(taskId: number, newStatus: TaskStatus): void {
    this._tasks.update((arr) =>
      arr.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  }

  // ── Work Logs ──

  /**
   * @description Add a work log entry to a task
   */
  addWorkLog(taskId: number, payload: WorkLogCreatePayload): Observable<WorkLog> {
    return this.http.post<WorkLog>(`${environment.apiUrl}/tasks/${taskId}/work-logs`, payload).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  /**
   * @description Get all work logs for a task
   */
  getWorkLogs(taskId: number): Observable<WorkLog[]> {
    return this.http.get<WorkLog[]>(`${environment.apiUrl}/tasks/${taskId}/work-logs`).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  // ── Active Members ──

  /**
   * @description Start working on a task
   */
  startWorking(taskId: number): Observable<ActiveMember> {
    return this.http.post<ActiveMember>(`${environment.apiUrl}/tasks/${taskId}/start-working`, {}).pipe(
      tap(() => {
        // Reload to get updated task with new active member
        this.loadTasks().subscribe();
      }),
      catchError((err) => throwError(() => err))
    );
  }

  /**
   * @description Stop working on a task
   */
  stopWorking(taskId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/tasks/${taskId}/stop-working`).pipe(
      tap(() => {
        this.loadTasks().subscribe();
      }),
      catchError((err) => throwError(() => err))
    );
  }
}
