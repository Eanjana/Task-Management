"""
Task Pydantic schemas for request/response validation.

@description Schemas for task CRUD operations
@author Anjana E
@date 24-03-2026
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from ..models.task import TaskStatus, TaskPriority


class AttachmentResponse(BaseModel):
    """Schema for attachment data in API responses."""
    id: int
    task_id: int
    file_path: str
    file_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class WorkLogUserResponse(BaseModel):
    """Minimal user info for work log entries."""
    id: int
    username: str

    class Config:
        from_attributes = True


class WorkLogResponse(BaseModel):
    """Schema for work log data in API responses."""
    id: int
    task_id: int
    user_id: int
    start_time: str
    end_time: str
    minutes_spent: int
    description: str = ""
    user: Optional[WorkLogUserResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WorkLogCreate(BaseModel):
    """Schema for creating a work log entry."""
    start_time: str
    end_time: str
    minutes_spent: int = Field(ge=0)
    description: str = ""


class ActiveMemberUserResponse(BaseModel):
    """Minimal user info for active task members."""
    id: int
    username: str

    class Config:
        from_attributes = True


class ActiveMemberResponse(BaseModel):
    """Schema for active task member data in API responses."""
    id: int
    task_id: int
    user_id: int
    started_at: datetime
    user: Optional[ActiveMemberUserResponse] = None

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    """Schema for creating a new task."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = ""
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.NORMAL
    assigned_time_minutes: Optional[int] = Field(default=0, ge=0)
    assignee_id: Optional[int] = None
    team: Optional[str] = ""


class TaskUpdate(BaseModel):
    """Schema for updating an existing task."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assigned_time_minutes: Optional[int] = Field(default=None, ge=0)
    total_time_spent_minutes: Optional[int] = Field(default=None, ge=0)
    assignee_id: Optional[int] = None
    team: Optional[str] = None
    completed_by_id: Optional[int] = None
    hidden_from_list: Optional[bool] = None


class AssigneeResponse(BaseModel):
    """Minimal user info for task assignee."""
    id: int
    username: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    """Schema for task data in API responses."""
    id: int
    title: str
    description: Optional[str] = ""
    status: TaskStatus
    priority: TaskPriority
    assigned_time_minutes: int
    total_time_spent_minutes: int
    assignee_id: Optional[int] = None
    completed_by_id: Optional[int] = None
    hidden_from_list: bool = False
    team: Optional[str] = ""
    assignee: Optional[AssigneeResponse] = None
    completed_by: Optional[AssigneeResponse] = None
    attachments: List[AttachmentResponse] = []
    work_logs: List[WorkLogResponse] = []
    active_members: List[ActiveMemberResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
