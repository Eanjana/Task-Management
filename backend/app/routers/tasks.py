"""
Task CRUD API router.

@description Endpoints for creating, reading, updating, and deleting tasks
@author Anjana E
@date 24-03-2026
"""

from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.task import TaskStatus
from ..models.user import User
from ..schemas.task import TaskCreate, TaskUpdate, TaskResponse
from ..services.auth import get_current_user
from ..services.task import (
    get_all_tasks,
    get_task_by_id,
    create_task,
    update_task,
    delete_task,
)

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("", response_model=List[TaskResponse])
def list_tasks(
    status: Optional[TaskStatus] = None,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Get all tasks, optionally filtered by status."""
    return get_all_tasks(db, status_filter=status)


@router.get("/{task_id}", response_model=TaskResponse)
def read_task(
    task_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Get a single task by ID."""
    return get_task_by_id(db, task_id)


@router.post("", response_model=TaskResponse, status_code=201)
def add_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Create a new task."""
    return create_task(db, task_data)


@router.patch("/{task_id}", response_model=TaskResponse)
def modify_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Update an existing task (partial update)."""
    return update_task(db, task_id, task_data)


@router.delete("/{task_id}", status_code=204)
def remove_task(
    task_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Delete a task by ID."""
    delete_task(db, task_id)
