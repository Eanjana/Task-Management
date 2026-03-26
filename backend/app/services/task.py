"""
Task service layer.

@description Handles CRUD operations for tasks
@author Anjana E
@date 24-03-2026
"""

from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.task import Task, TaskStatus
from ..models.work_log import WorkLog
from ..models.task_member import ActiveTaskMember
from ..schemas.task import TaskCreate, TaskUpdate, WorkLogCreate


def get_all_tasks(
    db: Session,
    status_filter: Optional[TaskStatus] = None,
) -> List[Task]:
    """Retrieve all tasks, optionally filtered by status."""
    query = db.query(Task)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    return query.order_by(Task.created_at.desc()).all()


def get_task_by_id(db: Session, task_id: int) -> Task:
    """
    Retrieve a single task by ID.

    Raises HTTPException if not found.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found",
        )
    return task


def create_task(db: Session, task_data: TaskCreate) -> Task:
    """Create a new task."""
    new_task = Task(
        title=task_data.title,
        description=task_data.description,
        status=task_data.status,
        priority=task_data.priority,
        assigned_time_minutes=task_data.assigned_time_minutes or 0,
        assignee_id=task_data.assignee_id,
        team=task_data.team,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


def update_task(db: Session, task_id: int, task_data: TaskUpdate) -> Task:
    """
    Update an existing task.

    Only updates fields that are explicitly provided (non-None).
    """
    task = get_task_by_id(db, task_id)
    update_data = task_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int) -> None:
    """Delete a task by ID."""
    task = get_task_by_id(db, task_id)
    db.delete(task)
    db.commit()


# ── Work Log operations ──

def add_work_log(db: Session, task_id: int, user_id: int, log_data: WorkLogCreate) -> WorkLog:
    """Add a work log entry to a task."""
    task = get_task_by_id(db, task_id)
    work_log = WorkLog(
        task_id=task_id,
        user_id=user_id,
        start_time=log_data.start_time,
        end_time=log_data.end_time,
        minutes_spent=log_data.minutes_spent,
        description=log_data.description,
    )
    db.add(work_log)

    # Recalculate total time from all work logs
    db.flush()
    total = sum(wl.minutes_spent for wl in task.work_logs)
    task.total_time_spent_minutes = total

    db.commit()
    db.refresh(task)
    db.refresh(work_log)
    return work_log


def get_work_logs(db: Session, task_id: int) -> List[WorkLog]:
    """Get all work logs for a task."""
    get_task_by_id(db, task_id)  # Validate task exists
    return db.query(WorkLog).filter(WorkLog.task_id == task_id).order_by(WorkLog.created_at).all()


# ── Active Task Member operations ──

def start_working(db: Session, task_id: int, user_id: int) -> ActiveTaskMember:
    """
    Mark a user as actively working on a task.
    Also transitions task from TODO to IN_PROGRESS if needed.
    """
    task = get_task_by_id(db, task_id)

    # Check if already active
    existing = db.query(ActiveTaskMember).filter(
        ActiveTaskMember.task_id == task_id,
        ActiveTaskMember.user_id == user_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already working on this task",
        )

    member = ActiveTaskMember(task_id=task_id, user_id=user_id)
    db.add(member)

    # Auto-transition todo → in_progress
    if task.status == TaskStatus.TODO:
        task.status = TaskStatus.IN_PROGRESS

    db.commit()
    db.refresh(member)
    db.refresh(task)
    return member


def stop_working(db: Session, task_id: int, user_id: int) -> None:
    """Remove a user from actively working on a task."""
    member = db.query(ActiveTaskMember).filter(
        ActiveTaskMember.task_id == task_id,
        ActiveTaskMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not currently working on this task",
        )
    db.delete(member)
    db.commit()
