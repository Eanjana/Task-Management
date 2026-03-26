/**
 * @description Task data models and interfaces
 * @author Anjana E
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

export interface WorkLogUser {
  id: number;
  username: string;
}

export interface WorkLog {
  id: number;
  task_id: number;
  user_id: number;
  start_time: string;
  end_time: string;
  minutes_spent: number;
  description: string;
  user: WorkLogUser | null;
  created_at: string;
}

export interface ActiveMember {
  id: number;
  task_id: number;
  user_id: number;
  started_at: string;
  user: WorkLogUser | null;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_time_minutes: number;
  total_time_spent_minutes: number;
  assignee_id: number | null;
  completed_by_id: number | null;
  hidden_from_list: boolean;
  assignee: TaskAssignee | null;
  completed_by: TaskAssignee | null;
  attachments: TaskAttachment[];
  work_logs: WorkLog[];
  active_members: ActiveMember[];
  team: string;
  created_at: string;
  updated_at: string | null;
}

export interface TaskCreatePayload {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_time_minutes: number;
  assignee_id: number | null;
  team: string;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_time_minutes?: number;
  total_time_spent_minutes?: number;
  assignee_id?: number | null;
  team?: string;
  completed_by_id?: number | null;
  hidden_from_list?: boolean;
}

export interface WorkLogCreatePayload {
  start_time: string;
  end_time: string;
  minutes_spent: number;
  description: string;
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
