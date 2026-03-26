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


class TaskCreate(BaseModel):
    """Schema for creating a new task."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = ""
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.NORMAL
    time_taken_minutes: Optional[int] = Field(default=0, ge=0)
    assignee_id: Optional[int] = None
    team: Optional[str] = ""


class TaskUpdate(BaseModel):
    """Schema for updating an existing task."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    time_taken_minutes: Optional[int] = Field(default=None, ge=0)
    assignee_id: Optional[int] = None
    team: Optional[str] = None


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
    time_taken_minutes: int
    assignee_id: Optional[int] = None
    team: Optional[str] = ""
    assignee: Optional[AssigneeResponse] = None
    attachments: List[AttachmentResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
