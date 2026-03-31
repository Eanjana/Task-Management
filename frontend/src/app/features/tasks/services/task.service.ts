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
  WorkLogUpdatePayload,
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
    const calculatedTotal = task.work_logs?.reduce((sum, log) => sum + (log.seconds_spent || 0), 0) || 0;
    return {
      ...task,
      total_time_spent_seconds: calculatedTotal || task.total_time_spent_seconds
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
   * @description Delete a work log entry by ID
   */
  deleteWorkLog(logId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/tasks/work-logs/${logId}`).pipe(
      tap(() => this.loadTasks().subscribe()),
      catchError((err) => throwError(() => err))
    );
  }

  /**
   * @description Update an existing work log entry
   */
  updateWorkLog(logId: number, payload: WorkLogUpdatePayload): Observable<WorkLog> {
    return this.http.patch<WorkLog>(`${environment.apiUrl}/tasks/work-logs/${logId}`, payload).pipe(
      tap(() => this.loadTasks().subscribe()),
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

  /**
   * @description Format seconds into [MO]mo [W]w [D]d [H]h [M]m [S]s format
   * Scales up to months and weeks. 1 month = 28 days (4 weeks) for clean work scaling.
   * @param limit If provided, limits output to the top N significant units.
   */
  formatDuration(seconds: number, showSeconds: boolean = false, limit: number = 3): string {
    const parts = this.calculateDurationParts(seconds, showSeconds);
    if (parts.length === 0) return '0m';

    // Return the top N significant parts
    return parts.slice(0, limit).map(p => `${p.val}${p.unit}`).join(' ');
  }

  /**
   * @description Internal helper to calculate all non-zero units for duration breakdown.
   */
  private calculateDurationParts(seconds: number, showSeconds: boolean = false): { val: number, unit: string }[] {
    if (!seconds && seconds !== 0) return [];
    const totalSeconds = Math.abs(seconds);
    
    // 1mo = 28 days
    const mo = Math.floor(totalSeconds / (28 * 24 * 3600));
    const w = Math.floor((totalSeconds % (28 * 24 * 3600)) / (7 * 24 * 3600));
    const d = Math.floor((totalSeconds % (7 * 24 * 3600)) / (24 * 3600));
    const h = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    const parts: { val: number, unit: string }[] = [];
    if (mo > 0) parts.push({ val: mo, unit: 'mo' });
    if (w > 0) parts.push({ val: w, unit: 'w' });
    if (d > 0) parts.push({ val: d, unit: 'd' });
    if (h > 0) parts.push({ val: h, unit: 'h' });
    if (m > 0) parts.push({ val: m, unit: 'm' });
    
    if (showSeconds && s > 0) {
      parts.push({ val: s, unit: 's' });
    }
    return parts;
  }

  /**
   * @description Returns a hierarchical duration breakdown for professional UI.
   * Separates the primary big-picture units from the precise minor ones.
   */
  getDurationBreakdown(seconds: number, majorLimit: number = 2): { major: string, minor: string } {
    const allParts = this.calculateDurationParts(seconds, false);
    if (allParts.length === 0) return { major: '0m', minor: '' };

    const majorParts = allParts.slice(0, majorLimit);
    const minorParts = allParts.slice(majorLimit);

    return {
      major: majorParts.map(p => `${p.val}${p.unit}`).join(' '),
      minor: minorParts.map(p => `${p.val}${p.unit}`).join(' ')
    };
  }

  /**
   * @description Formats the task's assigned time budget.
   * Uses precise hour/min formatting if manual budget was set.
   * Uses human-friendly scale (mo/w/d) if it uses a due-date fallback.
   */
  formatTaskBudget(task: Task, limit: number = 2): string {
    if (!task) return '—';
    if (task.assigned_time_seconds > 0) {
      return this.formatHours(task.assigned_time_seconds, false);
    } 
    
    const effectiveSeconds = this.getEffectiveBudget(task);
    if (effectiveSeconds === 0) return '—';
    
    return this.formatDuration(effectiveSeconds, false, limit);
  }

  /**
   * @description Formats difference/performance values based on task budget type.
   */
  private formatDiff(task: Task, seconds: number, showSeconds: boolean = false): string {
    if (task.assigned_time_seconds > 0) {
      return this.formatHours(Math.abs(seconds), showSeconds);
    }
    return this.formatDuration(Math.abs(seconds), showSeconds);
  }

  /**
   * @description Format seconds strictly in [H]h [M]m [S]s format (prevents days breakdown)
   */
  formatHours(seconds: number, showSeconds: boolean = true): string {
    if (!seconds && seconds !== 0) return '—';
    const totalSeconds = Math.abs(seconds);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);

    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (showSeconds && (s > 0 || parts.length === 0)) {
      parts.push(`${s}s`);
    } else if (!showSeconds && parts.length === 0) {
      parts.push(`${m}m`);
    }
    
    return parts.join(' ');
  }

  /**
   * @description Get effective budget for a task (manual assigned time or derived from due date)
   */
  getEffectiveBudget(task: Task): number {
    if (task.assigned_time_seconds && task.assigned_time_seconds > 0) {
      return task.assigned_time_seconds;
    }
    if (task.due_at) {
      const start = new Date(task.created_at);
      const end = new Date(task.due_at);
      return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    }
    return 0;
  }

  /**
   * @description Get total actual labor effort (Logged time + Currently active time) in seconds.
   * This is used for the primary 'Time Taken' and 'Performance' metrics.
   */
  getWorkingSecondsSpent(task: Task): number {
    // 1. Sum persisted work logs
    let totalSeconds = task.work_logs?.reduce((sum, log) => sum + (log.seconds_spent || 0), 0) || 0;

    // 2. Add active unpersisted sessions for 'In Progress' tasks
    if (task.status === 'in_progress' && task.active_members?.length) {
      const now = new Date();
      for (const member of task.active_members) {
        if (member.started_at) {
          const started = new Date(member.started_at);
          const elapsedMs = now.getTime() - started.getTime();
          totalSeconds += Math.max(0, Math.floor(elapsedMs / 1000));
        }
      }
    }

    return totalSeconds;
  }

  /**
   * @description Get unique contributors for a task (from work logs and active members)
   */
  getContributors(task: Task): { id: number, username: string }[] {
    const contributors = new Map<number, string>();
    
    // 1. From work logs
    task.work_logs?.forEach(log => {
      if (log.user) {
        contributors.set(log.user.id, log.user.username);
      }
    });

    // 2. From active members
    task.active_members?.forEach(member => {
      if (member.user) {
        contributors.set(member.user.id, member.user.username);
      }
    });

    // 3. Fallback to completed_by if not present
    if (task.completed_by && !contributors.has(task.completed_by.id)) {
      contributors.set(task.completed_by.id, task.completed_by.username);
    }

    return Array.from(contributors.entries()).map(([id, username]) => ({ id, username }));
  }

  /**
   * @description Calculate performance purely against total LOGGED labor effort vs assigned budget.
   */
  getPerformanceInfo(task: Task, showSeconds: boolean = true): { color: string, icon: string, label: string, diffText: string, detail: string } | null {
    const assigned = this.getEffectiveBudget(task);
    if (!assigned) return null;

    const spent = this.getWorkingSecondsSpent(task);
    const diff = spent - assigned;

    if (task.status === 'completed') {
      if (spent > 0 && diff <= 0) {
        const val = this.formatDiff(task, diff, showSeconds);
        return {
          label: 'Efficient Completion',
          color: 'success',
          icon: '↑',
          diffText: val,
          detail: `Outstanding! Completed with ${val} of budget remaining.`
        };
      } else if (diff > 0) {
        const val = this.formatDiff(task, diff, showSeconds);
        return {
          label: 'Delayed',
          color: 'danger',
          icon: '↓',
          diffText: val,
          detail: `Task required ${val} more effort than estimated.`
        };
      }
    } else {
      if (diff > 0) {
        const val = this.formatDiff(task, diff, showSeconds);
        return {
          label: 'Delayed',
          color: 'warning',
          icon: '!',
          diffText: val,
          detail: `Currently ${val} over estimated labor effort.`
        };
      }
    }
    return null;
  }

  /**
   * @description Calculate chronological timeline duration (Creation to Now/Completion)
   */
  getTimelinePerformance(task: Task, showSeconds: boolean = true): { color: string, icon: string, label: string, diffText: string, detail: string } | null {
    const endTime = task.completed_at ? new Date(task.completed_at) : new Date();
    const startTime = new Date(task.created_at);
    const elapsedSeconds = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));

    const assigned = this.getEffectiveBudget(task);
    const isLate = assigned > 0 ? elapsedSeconds > assigned : false;
    
    if (task.status === 'completed') {
      return {
        label: 'Calendar Duration',
        color: isLate ? 'warning' : 'success',
        icon: isLate ? '⚠' : '◷',
        diffText: this.formatDuration(elapsedSeconds, showSeconds),
        detail: `Task was completed ${this.formatDuration(elapsedSeconds, showSeconds)} after creation.`
      };
    } else {
      return {
        label: 'Timeline Status',
        color: isLate ? 'danger' : 'warning',
        icon: '◷',
        diffText: this.formatDuration(elapsedSeconds, showSeconds),
        detail: `Task has been active for ${this.formatDuration(elapsedSeconds, showSeconds)}.`
      };
    }
  }

  /**
   * @description Calculate actual labor effort (sum of all work logs + active sessions) vs assigned budget.
   * This is used for 'Efficiency Insights' to show if work was fast even if the task was delayed.
   * ONLY shown for completed tasks.
   */
  getLaborPerformance(task: Task, showSeconds: boolean = true): { isEfficient: boolean, secondsSaved: number, actualWorkSeconds: number, budgetSeconds: number, detail: string, title: string } | null {
    const budgetSeconds = this.getEffectiveBudget(task);
    if (!budgetSeconds || task.status !== 'completed') return null;

    // 1. Sum persisted work logs
    const actualWorkSeconds = task.work_logs?.reduce((sum, log) => sum + (log.seconds_spent || 0), 0) || 0;

    if (actualWorkSeconds === 0) return null;

    const isEfficient = actualWorkSeconds <= budgetSeconds;
    const diff = Math.abs(budgetSeconds - actualWorkSeconds);

    if (isEfficient) {
      return {
        isEfficient: true,
        secondsSaved: diff,
        actualWorkSeconds,
        budgetSeconds: task.assigned_time_seconds,
        title: 'Outstanding Efficiency',
        detail: `Exceptional work! Your team mastered the requirements in just ${this.formatDuration(actualWorkSeconds, showSeconds)}, saving ${this.formatHours(diff, showSeconds)} of planned effort. This high-performance delivery significantly boosts overall project momentum.`
      };
    } else {
      return {
        isEfficient: false,
        secondsSaved: 0,
        actualWorkSeconds,
        budgetSeconds: task.assigned_time_seconds,
        title: 'Improvement Opportunity',
        detail: `The actual effort of ${this.formatDuration(actualWorkSeconds, showSeconds)} exceeded the initial estimate of ${this.formatDuration(task.assigned_time_seconds, showSeconds)}. Analyzing the workflow and complexity for this task could help refine future estimations and optimize resource allocation.`
      };
    }
  }
}
