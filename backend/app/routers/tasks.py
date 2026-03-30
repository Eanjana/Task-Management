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
from ..schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse,
    WorkLogCreate, WorkLogResponse, ActiveMemberResponse,
)
from ..services.auth import get_current_user
from ..services.task import (
    get_all_tasks,
    get_task_by_id,
    create_task,
    update_task,
    delete_task,
    add_work_log,
    delete_work_log,
    get_work_logs,
    start_working,
    stop_working,
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


# ── Work Logs ──

@router.post("/{task_id}/work-logs", response_model=WorkLogResponse, status_code=201)
def create_work_log(
    task_id: int,
    log_data: WorkLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a work log entry to a task."""
    return add_work_log(db, task_id, current_user.id, log_data)


@router.get("/{task_id}/work-logs", response_model=List[WorkLogResponse])
def list_work_logs(
    task_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Get all work logs for a task."""
    return get_work_logs(db, task_id)


# ── Active Members ──

@router.post("/{task_id}/start-working", response_model=ActiveMemberResponse, status_code=201)
def start_working_on_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark current user as actively working on a task."""
    return start_working(db, task_id, current_user.id)


@router.delete("/{task_id}/stop-working", status_code=204)
def stop_working_on_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove current user from actively working on a task."""
    stop_working(db, task_id, current_user.id)


@router.delete("/work-logs/{log_id}", status_code=204)
def remove_work_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a work log entry."""
    # Find log for ownership check
    from ..models.work_log import WorkLog
    from fastapi import HTTPException
    
    log = db.query(WorkLog).filter(WorkLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Work log not found")
    
    if log.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own work logs")
        
    delete_work_log(db, log_id)
