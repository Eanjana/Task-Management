/**
 * @description Task data models and interfaces
 * @author Developer
 * @date 24-03-2026
 */

export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TaskAssignee {
  id: number;
  username: string;
  avatar_url: string | null;
}

export interface TaskAttachment {
  id: number;
  task_id: number;
  file_path: string;
  file_name: string;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  time_taken_minutes: number;
  assignee_id: number | null;
  assignee: TaskAssignee | null;
  attachments: TaskAttachment[];
  team: string; // Added field
  created_at: string;
  updated_at: string | null;
}

export interface TaskCreatePayload {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  time_taken_minutes: number;
  assignee_id: number | null;
  team: string; // Added field
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  time_taken_minutes?: number;
  assignee_id?: number | null;
  team?: string; // Added field
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};
