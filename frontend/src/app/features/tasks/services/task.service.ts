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
        this._tasks.set(tasks);
        this._isLoading.set(false);
      }),
      catchError((err) => {
        this._isLoading.set(false);
        return throwError(() => err);
      })
    );
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
        this._tasks.update((arr) => [task, ...arr]);
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
        this._tasks.update((arr) =>
          arr.map((t) => (t.id === id ? updated : t))
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
}
